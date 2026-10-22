import { validateRule, ruleParameters } from './validation.js'

export function importRuleBundle(db, baseId, rules, correctionId = null) {
  if (!db.prepare('SELECT id FROM knowledge_bases WHERE id = ?').get(baseId)) {
    throw new Error('Target knowledge base does not exist')
  }
  const keys = new Set()
  for (const rule of rules) {
    const error = validateRule(rule)
    if (error || !rule.import_key || keys.has(rule.import_key)) {
      throw new Error(`${rule.name}: ${error || 'Invalid or duplicate import key'}`)
    }
    keys.add(rule.import_key)
  }
  const insert = db.prepare(`
    INSERT INTO rules (
      name, conditions, conclusion, priority, enabled, match_mode,
      source_url, notes, knowledge_base_id, import_key, provenance, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  `)
  const update = db.prepare(`
    UPDATE rules SET name = ?, conditions = ?, conclusion = ?, priority = ?, enabled = ?,
      match_mode = ?, source_url = ?, notes = ?, import_key = ?, provenance = ?,
      updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE id = ? AND knowledge_base_id = ?
  `)
  const result = { inserted: 0, corrected: 0, skipped: 0, correction_before: null }
  db.exec('BEGIN IMMEDIATE')
  try {
    const correction = correctionId == null ? null : db.prepare(
      'SELECT * FROM rules WHERE id = ? AND knowledge_base_id = ?',
    ).get(correctionId, baseId)
    if (correctionId != null && !correction) throw new Error('Correction rule does not exist in target base')
    if (correction && correction.import_key == null
      && correction.conclusion !== 'CR400AF系列') {
      throw new Error('The original rule changed; review it before applying the correction')
    }
    for (const rule of rules) {
      const existing = db.prepare(
        'SELECT id FROM rules WHERE knowledge_base_id = ? AND import_key = ?',
      ).get(baseId, rule.import_key)
      if (existing) {
        result.skipped++
        continue
      }
      if (correction && correction.import_key == null && rule.conclusion === 'CR400AF') {
        result.correction_before = { ...correction }
        const corrected = { ...rule, priority: correction.priority, enabled: Boolean(correction.enabled) }
        update.run(
          ...ruleParameters(corrected), rule.import_key,
          JSON.stringify(rule.provenance), correction.id, baseId,
        )
        result.corrected++
      } else {
        insert.run(...ruleParameters(rule), baseId, rule.import_key, JSON.stringify(rule.provenance))
        result.inserted++
      }
    }
    db.exec('COMMIT')
    return result
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}
