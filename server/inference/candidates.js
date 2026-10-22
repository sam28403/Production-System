import { compareValue } from './conditions.js'

export function evidenceFor(fact, rule) {
  const expected = fact.field_key === 'series' ? rule.provenance?.family
    : rule.provenance?.attributes?.[fact.field_key]
  if (['environment', 'appearance'].includes(fact.field_key) && Array.isArray(expected)) {
    return expected.includes(fact.value) ? 'matched' : 'unknown'
  }
  const related = rule.conditions.filter((condition) => condition.field === fact.field_key)
  if (related.length) {
    const matches = related.map((condition) => compareValue(fact.value, condition.operator, condition.value))
    return (rule.match_mode === 'any' ? matches.some(Boolean) : matches.every(Boolean))
      ? 'matched' : 'conflict'
  }
  if (expected === null || expected === undefined) return 'unknown'
  const values = Array.isArray(expected) ? expected : [expected]
  return values.some((value) => compareValue(fact.value, 'eq', value)) ? 'matched' : 'conflict'
}

export function findCandidates(rules, initialFacts, firedIds) {
  const candidates = []
  for (const rule of rules.filter((item) => item.provenance?.model)) {
    const evidence = initialFacts.map((fact) => ({
      field: fact.field_key, value: fact.value, status: evidenceFor(fact, rule),
    }))
    if (evidence.some((item) => item.status === 'conflict')) continue
    const matched = evidence.filter((item) => item.status === 'matched').length
    if (!matched) continue
    candidates.push({
      rule_id: rule.id,
      model: rule.provenance.model,
      family: rule.provenance.family || '',
      matched,
      total: evidence.length,
      status: matched === evidence.length ? 'supported' : 'unverified',
      rule_fired: firedIds.has(rule.id),
      evidence,
      source_url: rule.source_url,
    })
  }
  return candidates.sort((a, b) => b.matched - a.matched || a.model.localeCompare(b.model))
}
