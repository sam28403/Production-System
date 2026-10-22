import { Router } from 'express'
import { ruleParameters, validateRule } from './validation.js'
import { knowledgeBaseScope } from '../knowledge-bases/scope.js'

function serialize(row) {
  return { ...row, conditions: JSON.parse(row.conditions), enabled: Boolean(row.enabled) }
}

export function ruleRouter(db) {
  const router = Router({ mergeParams: true })
  router.use(knowledgeBaseScope(db))

  router.param('ruleId', (req, res, next, value) => {
    const id = Number(value)
    if (!Number.isSafeInteger(id) || id < 1) {
      return res.status(400).json({ message: '规则编号无效。' })
    }
    const row = db.prepare(
      'SELECT * FROM rules WHERE id = ? AND knowledge_base_id = ?',
    ).get(id, req.baseId)
    if (!row) return res.status(404).json({ message: '规则不存在。' })
    req.rule = row
    next()
  })

  router.get('/', (req, res) => {
    const rows = db.prepare(`
      SELECT * FROM rules WHERE knowledge_base_id = ? ORDER BY priority DESC, id DESC
    `).all(req.baseId)
    res.json(rows.map(serialize))
  })

  router.get('/:ruleId', (req, res) => res.json(serialize(req.rule)))

  router.post('/', (req, res) => {
    const error = validateRule(req.body)
    if (error) return res.status(400).json({ message: error })
    const result = db.prepare(`
      INSERT INTO rules (
        name, conditions, conclusion, priority, enabled, match_mode,
        source_url, notes, knowledge_base_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(...ruleParameters(req.body), req.baseId)
    const row = db.prepare('SELECT * FROM rules WHERE id = ?').get(result.lastInsertRowid)
    res.status(201).json(serialize(row))
  })

  router.put('/:ruleId', (req, res) => {
    const error = validateRule(req.body)
    if (error) return res.status(400).json({ message: error })
    db.prepare(`
      UPDATE rules SET name = ?, conditions = ?, conclusion = ?, priority = ?,
        enabled = ?, match_mode = ?, source_url = ?, notes = ?,
        updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE id = ? AND knowledge_base_id = ?
    `).run(...ruleParameters(req.body), req.rule.id, req.baseId)
    res.json(serialize(db.prepare('SELECT * FROM rules WHERE id = ?').get(req.rule.id)))
  })

  router.delete('/:ruleId', (req, res) => {
    db.prepare('DELETE FROM rules WHERE id = ? AND knowledge_base_id = ?')
      .run(req.rule.id, req.baseId)
    res.status(204).end()
  })
  return router
}
