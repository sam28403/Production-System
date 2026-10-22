import { Router } from 'express'
import { knowledgeBaseScope } from '../knowledge-bases/scope.js'
import { validateCondition } from '../../shared/condition-validation.js'
import { ruleFields } from '../../shared/rule-fields.js'
import { runInference } from './engine.js'
import { loadRuleSnapshot, serializeRun } from './repository.js'
import { writeReport } from './report.js'

export function inferenceRouter(db, reportDirectory) {
  const router = Router({ mergeParams: true })
  router.use(knowledgeBaseScope(db))
  router.param('runId', (req, res, next, value) => {
    const id = Number(value)
    if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ message: '实验编号无效。' })
    const row = db.prepare('SELECT * FROM inference_runs WHERE id = ? AND knowledge_base_id = ?')
      .get(id, req.baseId)
    if (!row) return res.status(404).json({ message: '实验记录不存在。' })
    req.run = serializeRun(row)
    next()
  })
  router.get('/', (req, res) => {
    res.json(db.prepare(`
      SELECT id, created_at, json_array_length(initial_facts) AS fact_count,
        json_array_length(trace) AS step_count,
        coalesce(json_array_length(conclusions, '$.candidates'), 0) AS candidate_count
      FROM inference_runs WHERE knowledge_base_id = ? ORDER BY id DESC
    `).all(req.baseId))
  })
  router.get('/:runId', (req, res) => res.json(req.run))
  router.post('/', (req, res) => {
    const ids = req.body?.fact_ids
    if (!Array.isArray(ids) || !ids.length || ids.length > 100
      || ids.some((id) => !Number.isSafeInteger(id) || id < 1) || new Set(ids).size !== ids.length) {
      return res.status(400).json({ message: '请选择 1–100 条不重复的事实。' })
    }
    const facts = []
    for (const id of ids) {
      const row = db.prepare('SELECT * FROM facts WHERE id = ? AND knowledge_base_id = ?')
        .get(id, req.baseId)
      if (!row) return res.status(404).json({ message: '选中的事实不存在或不属于当前知识库。' })
      const fact = { id: row.id, name: row.name, field_key: row.field_key, value: JSON.parse(row.value_json) }
      if (validateCondition({ field: fact.field_key, operator: 'eq', value: fact.value })) {
        return res.status(400).json({ message: `请先补充事实“${row.name}”的有效字段和值。` })
      }
      facts.push(fact)
    }
    const snapshot = loadRuleSnapshot(db, req.baseId)
    let result
    try {
      result = runInference(facts, snapshot)
    } catch (error) {
      if (!error.fields) throw error
      const fields = error.fields.map((field) => ruleFields.find((item) => item.value === field)?.label || field)
      return res.status(400).json({ message: `以下字段存在冲突值：${fields.join('、')}。` })
    }
    const { trace, ...conclusions } = result
    const insert = db.prepare(`
      INSERT INTO inference_runs (knowledge_base_id, initial_facts, trace, conclusions, rule_snapshot)
      VALUES (?, ?, ?, ?, ?)
    `).run(req.baseId, JSON.stringify(facts), JSON.stringify(trace), JSON.stringify(conclusions), JSON.stringify(snapshot))
    res.status(201).json(serializeRun(db.prepare('SELECT * FROM inference_runs WHERE id = ?').get(insert.lastInsertRowid)))
  })
  router.get('/:runId/report', (req, res) => {
    const format = req.query.format || 'json'
    if (!['json', 'md'].includes(format)) return res.status(400).json({ message: '报告格式无效。' })
    const content = writeReport(req.run, format, reportDirectory)
    res.attachment(`inference-${req.run.id}.${format}`)
      .type(format === 'json' ? 'application/json' : 'text/markdown').send(content)
  })
  router.delete('/:runId', (req, res) => {
    db.prepare('DELETE FROM inference_runs WHERE id = ? AND knowledge_base_id = ?')
      .run(req.run.id, req.baseId)
    res.status(204).end()
  })
  return router
}
