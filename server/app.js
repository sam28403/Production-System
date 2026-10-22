import express from 'express'
import { ruleRouter } from './rules/routes.js'
import { factRouter } from './facts/routes.js'
import { inferenceRouter } from './inference/routes.js'
import { graphRouter } from './graph/routes.js'

const listQuery = `
  SELECT k.*,
    (SELECT count(*) FROM rules WHERE knowledge_base_id = k.id) AS rule_count,
    (SELECT count(*) FROM facts WHERE knowledge_base_id = k.id) AS fact_count
  FROM knowledge_bases k ORDER BY k.id DESC
`

export function createApp(db, { reportDirectory, graphOptions } = {}) {
  const app = express()
  app.disable('x-powered-by')
  app.use(express.json({ limit: '32kb' }))

  app.get('/api/health', (req, res) => {
    db.prepare('SELECT 1').get()
    res.json({ status: 'ok', database: 'connected', engine: 'SQLite' })
  })

  app.get('/api/overview', (req, res) => {
    const count = (table) => db.prepare(`SELECT count(*) AS total FROM ${table}`).get().total
    res.json({
      knowledgeBases: count('knowledge_bases'),
      rules: count('rules'),
      facts: count('facts'),
      runs: count('inference_runs'),
    })
  })

  app.get('/api/knowledge-bases', (req, res) => {
    res.json(db.prepare(listQuery).all())
  })

  app.post('/api/knowledge-bases', (req, res) => {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
    const description = typeof req.body?.description === 'string'
      ? req.body.description.trim() : ''
    if (!name || name.length > 40 || description.length > 300) {
      return res.status(400).json({ message: '名称需为 1–40 字，描述不能超过 300 字。' })
    }
    const result = db.prepare(
      'INSERT INTO knowledge_bases (name, description) VALUES (?, ?)',
    ).run(name, description)
    res.status(201).json(db.prepare(
      'SELECT * FROM knowledge_bases WHERE id = ?',
    ).get(result.lastInsertRowid))
  })

  app.delete('/api/knowledge-bases/:id', (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isSafeInteger(id) || id < 1) {
      return res.status(400).json({ message: '知识库编号无效。' })
    }
    const result = db.prepare('DELETE FROM knowledge_bases WHERE id = ?').run(id)
    if (!result.changes) return res.status(404).json({ message: '知识库不存在。' })
    res.status(204).end()
  })

  app.use('/api/knowledge-bases/:baseId/rules', ruleRouter(db))
  app.use('/api/knowledge-bases/:baseId/facts', factRouter(db))
  app.use('/api/knowledge-bases/:baseId/runs', inferenceRouter(db, reportDirectory))
  const graph = graphRouter(db, graphOptions)
  app.use('/api/knowledge-bases/:baseId/graph', graph.router)
  app.locals.closeGraph = graph.close
  app.use('/api', (req, res) => res.status(404).json({ message: '接口不存在。' }))
  app.use((error, req, res, next) => {
    if (error instanceof SyntaxError || error.type === 'entity.too.large') {
      return res.status(400).json({ message: '请求数据格式或大小不符合要求。' })
    }
    console.error(error)
    res.status(500).json({ message: '服务暂时不可用，请稍后重试。' })
  })
  return app
}
