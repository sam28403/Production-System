import { explainCandidates } from './explanation.js'

export function loadRuleSnapshot(db, baseId) {
  return db.prepare(`
    SELECT * FROM rules WHERE knowledge_base_id = ? AND enabled = 1
    ORDER BY priority DESC, id ASC
  `).all(baseId).map((row) => ({
    ...row, enabled: Boolean(row.enabled),
    conditions: JSON.parse(row.conditions), provenance: JSON.parse(row.provenance),
  }))
}

export function serializeRun(row) {
  const { initial_facts, trace, conclusions, rule_snapshot, ...run } = row
  const initialFacts = JSON.parse(initial_facts)
  const snapshot = JSON.parse(rule_snapshot)
  const result = JSON.parse(conclusions)
  if (result && !Array.isArray(result) && !result.explanation) {
    result.explanation = explainCandidates(snapshot, initialFacts, result.candidates || [])
  }
  return {
    ...run,
    initial_facts: initialFacts,
    trace: JSON.parse(trace),
    result,
    rule_snapshot: snapshot,
  }
}
