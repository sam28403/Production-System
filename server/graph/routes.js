import { Router } from 'express'
import { knowledgeBaseScope } from '../knowledge-bases/scope.js'
import { graphConfig } from './config.js'
import { projectKnowledgeBase } from './projection.js'
import { createGraphStore } from './store.js'
import { graphView } from './view.js'
import { edgeKinds, nodeKinds } from './schema.js'

export function graphRouter(db, options = {}) {
  const router = Router({ mergeParams: true })
  const config = options.config || graphConfig()
  const store = options.store || createGraphStore(config)
  const syncing = new Set()
  router.use(knowledgeBaseScope(db))
  router.get('/status', async (req, res) => {
    if (!config.configured) return res.json({ configured: false, connected: false })
    try {
      const metadata = await store.status(req.baseId)
      const current = projectKnowledgeBase(db, req.baseId)
      res.json({
        configured: true, connected: true, metadata,
        stale: metadata?.fingerprint !== current.fingerprint,
        browser_url: config.browserUrl,
      })
    } catch {
      res.json({ configured: true, connected: false, message: 'Neo4j 连接失败，请检查服务和连接配置。' })
    }
  })
  const available = (req, res, next) => config.configured ? next()
    : res.status(503).json({ message: 'Neo4j 尚未配置。' })
  router.post('/sync', available, async (req, res) => {
    if (syncing.has(req.baseId)) return res.status(409).json({ message: '图谱正在同步，请稍后重试。' })
    syncing.add(req.baseId)
    try {
      const graph = projectKnowledgeBase(db, req.baseId)
      const metadata = await store.sync(req.baseId, graph)
      res.json(metadata)
    } catch {
      res.status(503).json({ message: '图谱同步失败，请检查 Neo4j 连接及写入权限。' })
    } finally {
      syncing.delete(req.baseId)
    }
  })
  router.get('/', available, async (req, res) => {
    const query = req.query.q || ''
    const limit = req.query.limit === undefined ? 1 : Number(req.query.limit)
    if (Object.keys(req.query).some((key) => !['q', 'limit'].includes(key))
      || typeof query !== 'string' || query.length > 100
      || !Number.isSafeInteger(limit) || limit < 1 || limit > 12) {
      return res.status(400).json({ message: '图谱查询条件无效。' })
    }
    try {
      const graph = await store.read(req.baseId)
      res.json({ ...graphView(graph, query, limit), node_kinds: nodeKinds, edge_kinds: edgeKinds, engine: 'Neo4j' })
    } catch {
      res.status(503).json({ message: '图谱读取失败，请检查 Neo4j 连接。' })
    }
  })
  return { router, close: () => store.close() }
}
