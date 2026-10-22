import neo4j from 'neo4j-driver'
import { edgeKinds, nodeKinds } from './schema.js'

export function createGraphStore(config) {
  let driver
  const getDriver = () => {
    if (!config.configured) throw new Error('Neo4j connection is not configured')
    driver ||= neo4j.driver(config.uri, neo4j.auth.basic(config.user, config.password), {
      connectionTimeout: 5000, maxConnectionPoolSize: 5,
      maxTransactionRetryTime: 5000, disableLosslessIntegers: true,
    })
    return driver
  }
  const withSession = async (action) => {
    const session = getDriver().session({ database: config.database })
    try { return await action(session) } finally { await session.close() }
  }
  return {
    async status(baseId) {
      await getDriver().verifyConnectivity()
      return withSession(async (session) => {
        const result = await session.run(`MATCH (s:RailwaySync {kb_id: $baseId})
          RETURN properties(s) AS metadata`, { baseId })
        return result.records[0]?.get('metadata') || null
      })
    },
    async sync(baseId, graph) {
      return withSession(async (session) => {
        await session.run('CREATE CONSTRAINT railway_uid IF NOT EXISTS FOR (n:RailwayEntity) REQUIRE n.uid IS UNIQUE')
        await session.run('CREATE CONSTRAINT railway_sync_id IF NOT EXISTS FOR (n:RailwaySync) REQUIRE n.kb_id IS UNIQUE')
        return session.executeWrite(async (tx) => {
          // Lock one knowledge base before replacing its projection; other labels/data are untouched.
          await tx.run(`MERGE (s:RailwaySync {kb_id: $baseId})
            SET s.lock_version = coalesce(s.lock_version, 0) + 1`, { baseId })
          await tx.run('MATCH (n:RailwayEntity {kb_id: $baseId}) DETACH DELETE n', { baseId })
          for (const kind of Object.keys(nodeKinds)) {
            const rows = graph.nodes.filter((node) => node.kind === kind)
            if (rows.length) await tx.run(`UNWIND $rows AS row
              CREATE (n:RailwayEntity:${kind}) SET n = row`, { rows })
          }
          for (const type of Object.keys(edgeKinds)) {
            const rows = graph.edges.filter((edge) => edge.type === type)
            if (rows.length) await tx.run(`UNWIND $rows AS row
              MATCH (a:RailwayEntity {uid: row.source}), (b:RailwayEntity {uid: row.target})
              CREATE (a)-[r:${type}]->(b) SET r = row`, { rows })
          }
          const metadata = {
            kb_id: baseId, fingerprint: graph.fingerprint, synced_at: new Date().toISOString(),
            nodes: graph.nodes.length, edges: graph.edges.length,
          }
          await tx.run('MATCH (s:RailwaySync {kb_id: $baseId}) SET s += $metadata', { baseId, metadata })
          return metadata
        })
      })
    },
    async read(baseId) {
      return withSession((session) => session.executeRead(async (tx) => {
        const nodes = await tx.run(`MATCH (n:RailwayEntity {kb_id: $baseId}) RETURN properties(n) AS node`, { baseId })
        const edges = await tx.run(`MATCH (:RailwayEntity {kb_id: $baseId})-[r]->(:RailwayEntity {kb_id: $baseId})
          RETURN properties(r) AS edge`, { baseId })
        return {
          nodes: nodes.records.map((record) => record.get('node')),
          edges: edges.records.map((record) => record.get('edge')),
        }
      }))
    },
    async close() { await driver?.close() },
  }
}
