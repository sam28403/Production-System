import { Router } from 'express'
import { knowledgeBaseScope } from '../knowledge-bases/scope.js'
import { factParameters, validateFact } from './validation.js'

function serialize(row) {
  const { value_json, ...fact } = row
  return { ...fact, value: value_json === null ? null : JSON.parse(value_json) }
}

export function factRouter(db) {
  const router = Router({ mergeParams: true })
  router.use(knowledgeBaseScope(db))
  router.param('factId', (req, res, next, value) => {
    const id = Number(value)
    if (!Number.isSafeInteger(id) || id < 1) {
      return res.status(400).json({ message: '事实编号无效。' })
    }
    const row = db.prepare('SELECT * FROM facts WHERE id = ? AND knowledge_base_id = ?')
      .get(id, req.baseId)
    if (!row) return res.status(404).json({ message: '事实不存在。' })
    req.fact = row
    next()
  })
  router.get('/', (req, res) => {
    res.json(db.prepare('SELECT * FROM facts WHERE knowledge_base_id = ? ORDER BY id DESC')
      .all(req.baseId).map(serialize))
  })
  router.get('/:factId', (req, res) => res.json(serialize(req.fact)))

  function writeFact(req, res) {
    const error = validateFact(req.body)
    if (error) return res.status(400).json({ message: error })
    const parameters = factParameters(req.body)
    const [name, field, value] = parameters
    const duplicate = db.prepare(`
      SELECT id FROM facts WHERE knowledge_base_id = ? AND id != ?
        AND (name = ? OR (field_key = ? AND value_json = ?))
    `).get(req.baseId, req.fact?.id || 0, name, field, value)
    if (duplicate) return res.status(409).json({ message: '已存在同名或相同特征值的事实。' })
    let id = req.fact?.id
    try {
      if (id) {
        db.prepare(`
          UPDATE facts SET name = ?, field_key = ?, value_json = ?, source_url = ?, notes = ?,
            updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
          WHERE id = ? AND knowledge_base_id = ?
        `).run(...parameters, id, req.baseId)
      } else {
        id = db.prepare(`
          INSERT INTO facts (name, field_key, value_json, source_url, notes, knowledge_base_id,
            created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
            strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
        `).run(...parameters, req.baseId).lastInsertRowid
      }
    } catch (cause) {
      if (cause.errcode === 2067) {
        return res.status(409).json({ message: '已存在同名或相同特征值的事实。' })
      }
      throw cause
    }
    const row = db.prepare('SELECT * FROM facts WHERE id = ? AND knowledge_base_id = ?')
      .get(id, req.baseId)
    res.status(req.fact ? 200 : 201).json(serialize(row))
  }
  router.post('/', writeFact)
  router.put('/:factId', writeFact)
  router.delete('/:factId', (req, res) => {
    db.prepare('DELETE FROM facts WHERE id = ? AND knowledge_base_id = ?').run(req.fact.id, req.baseId)
    res.status(204).end()
  })
  return router
}
