import { test } from 'node:test'
import assert from 'node:assert/strict'
import { openDatabase } from '../database.js'
import { projectKnowledgeBase } from '../graph/projection.js'
import { graphView } from '../graph/view.js'
import { graphConfig } from '../graph/config.js'
import { createApp } from '../app.js'

function database() {
  const db = openDatabase(':memory:')
  db.prepare('INSERT INTO knowledge_bases (id, name) VALUES (1, ?), (2, ?)').run('铁路', '其他')
  db.prepare(`INSERT INTO rules
    (knowledge_base_id, name, conclusion, conditions, provenance)
    VALUES (1, 'CRH5A 规则', 'CRH5A', ?, ?)`)
    .run(JSON.stringify([{ field: 'brand', operator: 'eq', value: '和谐号' }]), JSON.stringify({
      model: 'CRH5A', family: 'CRH5', attributes: { environment: ['高寒'], car_count: 8 },
    }))
  db.prepare(`INSERT INTO facts (knowledge_base_id, name, field_key, value_json)
    VALUES (1, '高寒', 'environment', '"高寒"')`).run()
  return db
}

test('图谱区分资料特征和规则条件，实体去重且限定知识库', () => {
  const db = database()
  try {
    const graph = projectKnowledgeBase(db, 1)
    assert.equal(new Set(graph.nodes.map((node) => node.uid)).size, graph.nodes.length)
    assert.ok(graph.nodes.every((node) => node.kb_id === 1))
    assert.deepEqual(projectKnowledgeBase(db, 2).nodes, [])
    const model = graph.nodes.find((node) => node.kind === 'Model')
    const brand = graph.nodes.find((node) => node.kind === 'Feature' && node.field === 'brand')
    assert.ok(graph.edges.some((edge) => edge.target === model.uid && edge.type === 'CONCLUDES'))
    assert.equal(graph.edges.some((edge) => edge.source === model.uid && edge.target === brand.uid), false)
    assert.ok(graph.edges.some((edge) => edge.target === brand.uid && edge.type === 'COMPARES'))
    assert.equal(graph.nodes.filter((node) => node.field === 'environment' && node.kind === 'Feature').length, 1)
    assert.equal(projectKnowledgeBase(db, 1).fingerprint, graph.fingerprint)
    const view = graphView(graph, 'crh5a', 1)
    assert.equal(view.shown_models, 1)
    assert.equal(view.nodes.length, graph.nodes.length)
    assert.equal(graphView(graph, '不存在', 1).nodes.length, 0)
    db.prepare('UPDATE facts SET value_json = ?').run('"高海拔"')
    assert.notEqual(projectKnowledgeBase(db, 1).fingerprint, graph.fingerprint)
  } finally { db.close() }
})

test('Neo4j 状态和接口不伪造数据，限制查询且隔离知识库', async () => {
  const db = database()
  const saved = new Map()
  const store = {
    async status(id) { return saved.get(id)?.metadata || null },
    async sync(id, graph) {
      const metadata = { fingerprint: graph.fingerprint, synced_at: new Date().toISOString() }
      saved.set(id, { ...graph, metadata })
      return metadata
    },
    async read(id) { return saved.get(id) || { nodes: [], edges: [] } },
    async close() {},
  }
  const config = { configured: true, browserUrl: 'http://127.0.0.1:7474/browser/' }
  const app = createApp(db, { graphOptions: { config, store } })
  const server = app.listen(0, '127.0.0.1')
  await new Promise((resolve) => server.once('listening', resolve))
  const root = `http://127.0.0.1:${server.address().port}/api/knowledge-bases`
  try {
    const before = await fetch(`${root}/1/graph/status`).then((response) => response.json())
    assert.equal(before.stale, true)
    assert.equal(before.connected, true)
    assert.equal((await fetch(`${root}/1/graph/sync`, { method: 'POST' })).status, 200)
    const after = await fetch(`${root}/1/graph/status`).then((response) => response.json())
    assert.equal(after.stale, false)
    const graph = await fetch(`${root}/1/graph?q=CRH5A`).then((response) => response.json())
    assert.equal(graph.engine, 'Neo4j')
    assert.ok(graph.nodes.some((node) => node.kind === 'Model'))
    assert.equal((await fetch(`${root}/2/graph`).then((r) => r.json())).nodes.length, 0)
    assert.equal((await fetch(`${root}/999/graph`)).status, 404)
    assert.equal((await fetch(`${root}/1/graph?limit=1000`)).status, 400)
    assert.equal((await fetch(`${root}/1/graph?q[x]=test`)).status, 400)
    store.read = async () => { throw new Error('connection lost with private details') }
    const failure = await fetch(`${root}/1/graph`)
    assert.equal(failure.status, 503)
    assert.equal((await failure.text()).includes('private details'), false)
  } finally {
    await new Promise((resolve) => server.close(resolve))
    db.close()
  }
})

test('缺少 Neo4j 配置时状态明确，图谱和写入接口返回 503', async () => {
  assert.equal(graphConfig({}).configured, false)
  assert.equal(graphConfig({ NEO4J_PASSWORD: 'test', NEO4J_URI: 'http://localhost' }).configured, false)
  assert.equal(graphConfig({ NEO4J_BROWSER_URL: 'javascript:alert(1)' }).browserUrl, '')
  const db = database()
  const app = createApp(db, { graphOptions: { config: graphConfig({}) } })
  const server = app.listen(0, '127.0.0.1')
  await new Promise((resolve) => server.once('listening', resolve))
  const root = `http://127.0.0.1:${server.address().port}/api/knowledge-bases/1/graph`
  try {
    const status = await fetch(`${root}/status`).then((response) => response.json())
    assert.deepEqual(status, { configured: false, connected: false })
    assert.equal((await fetch(root)).status, 503)
    assert.equal((await fetch(`${root}/sync`, { method: 'POST' })).status, 503)
  } finally {
    await new Promise((resolve) => server.close(resolve))
    await app.locals.closeGraph()
    db.close()
  }
})
