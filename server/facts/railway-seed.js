import { ruleFields } from '../../shared/rule-fields.js'
import { factParameters, validateFact } from './validation.js'
import { enrichEnvironment } from '../rules/railway-environment.js'
import { validateRule } from '../rules/validation.js'

export function completeRailwayFacts(db, baseId, weather) {
  if (!db.prepare('SELECT id FROM knowledge_bases WHERE id = ?').get(baseId)) {
    throw new Error('Knowledge base does not exist')
  }
  const result = { inserted: 0, skipped: 0, updated_rules: [], conflicts: [] }
  const validFields = new Set(ruleFields.map((field) => field.value))
  const candidates = new Map()
  const add = (field, value, source) => {
    if (!validFields.has(field) || field === 'derived_feature' || value == null) return
    for (const item of Array.isArray(value) ? value : [value]) {
      const fact = { name: '', field_key: field, value: item, source_url: source || '', notes: '' }
      if (validateFact(fact)) throw new Error(`Invalid source fact: ${field} ${item}`)
      candidates.set(JSON.stringify([field, item]), fact)
    }
  }
  db.exec('BEGIN IMMEDIATE')
  try {
    const rows = db.prepare('SELECT * FROM rules WHERE knowledge_base_id = ? AND enabled = 1').all(baseId)
    for (const row of rows) {
      const original = {
        ...row, enabled: Boolean(row.enabled), conditions: JSON.parse(row.conditions),
        provenance: JSON.parse(row.provenance),
      }
      if (!original.provenance?.model || validateRule(original)) continue
      const enriched = enrichEnvironment(original, weather)
      const rule = enriched.rule
      if (enriched.conflict) result.conflicts.push(row.id)
      if (enriched.changed) {
        db.prepare(`UPDATE rules SET conditions = ?, provenance = ?,
          updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`)
          .run(JSON.stringify(rule.conditions), JSON.stringify(rule.provenance), row.id)
        result.updated_rules.push({ id: row.id, model: rule.provenance.model })
      }
      add('series', rule.provenance.family, rule.source_url)
      for (const [field, value] of Object.entries(rule.provenance.attributes || {})) {
        add(field, value, field === 'environment' ? weather.source_url : rule.source_url)
      }
      for (const condition of rule.conditions.filter((item) => item.operator === 'eq')) {
        add(condition.field, condition.value, rule.source_url)
      }
    }
    const exists = db.prepare(`SELECT id FROM facts
      WHERE knowledge_base_id = ? AND field_key = ? AND value_json = ?`)
    const nameExists = db.prepare('SELECT id FROM facts WHERE knowledge_base_id = ? AND name = ?')
    const insert = db.prepare(`INSERT INTO facts
      (knowledge_base_id, name, field_key, value_json, source_url, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
        strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`)
    for (const fact of candidates.values()) {
      const parameters = factParameters(fact)
      if (exists.get(baseId, fact.field_key, parameters[2])) {
        result.skipped++
        continue
      }
      const originalName = parameters[0]
      let suffix = 2
      while (nameExists.get(baseId, parameters[0])) parameters[0] = `${originalName} (${suffix++})`
      insert.run(baseId, ...parameters)
      result.inserted++
    }
    db.exec('COMMIT')
    return result
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}
