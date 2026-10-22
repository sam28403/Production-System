import { test } from 'node:test'
import assert from 'node:assert/strict'
import neo4j from 'neo4j-driver'
import { graphConfig } from '../graph/config.js'
import { createGraphStore } from '../graph/store.js'

test('真实 Neo4j 连通、重复同步、知识库隔离和失败回滚', async () => {
  const config = graphConfig()
  assert.ok(config.configured, '请先填写 .env.local 的 Neo4j 连接配置')
  // Negative IDs cannot collide with the application's positive knowledge base IDs.
  const baseId = -Date.now()
  const otherId = baseId - 1
  const store = createGraphStore(config)
  const cleanup = neo4j.driver(config.uri, neo4j.auth.basic(config.user, config.password), {
    connectionTimeout: 5000, maxTransactionRetryTime: 0,
  })
  const model = { uid: `${baseId}:Model:test`, kb_id: baseId, kind: 'Model', title: 'Neo4j 联调车型' }
  const feature = { uid: `${baseId}:Feature:test`, kb_id: baseId, kind: 'Feature', title: '车辆数量：8', value: '8' }
  const edge = {
    uid: `${baseId}:edge:test`, kb_id: baseId, type: 'HAS_FEATURE',
    source: model.uid, target: feature.uid,
  }
  const graph = { nodes: [model, feature], edges: [edge], fingerprint: `${baseId}:snapshot` }
  try {
    await store.sync(baseId, graph)
    const first = await store.read(baseId)
    assert.equal(first.nodes.length, 2)
    assert.equal(first.edges.length, 1)
    assert.equal((await store.status(baseId)).fingerprint, graph.fingerprint)
    await store.sync(baseId, graph)
    assert.equal((await store.read(baseId)).nodes.length, 2)
    assert.equal((await store.read(otherId)).nodes.length, 0)
    // Neo4j rejects nested maps as node properties after the transaction has deleted the old projection.
    await assert.rejects(store.sync(baseId, {
      ...graph, fingerprint: 'must-not-commit',
      nodes: [model, { ...feature, invalid_property: { nested: true } }],
    }))
    assert.equal((await store.read(baseId)).nodes.length, 2)
    assert.equal((await store.read(baseId)).edges.length, 1)
    assert.equal((await store.status(baseId)).fingerprint, graph.fingerprint)
  } finally {
    const session = cleanup.session({ database: config.database })
    try {
      await session.executeWrite(async (tx) => {
        await tx.run('MATCH (n:RailwayEntity {kb_id: $baseId}) DETACH DELETE n', { baseId })
        await tx.run('MATCH (s:RailwaySync {kb_id: $baseId}) DELETE s', { baseId })
      })
    } finally {
      await session.close()
      await cleanup.close()
      await store.close()
    }
  }
})
