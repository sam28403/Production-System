import { validateRule } from '../rules/validation.js'
import { conditionState, factConflicts } from './conditions.js'
import { findCandidates } from './candidates.js'
import { explainCandidates } from './explanation.js'

export function runInference(initialFacts, ruleSnapshot) {
  const conflicts = factConflicts(initialFacts)
  if (conflicts.length) {
    const error = new Error('选择的事实存在同一字段的冲突值。')
    error.fields = conflicts
    throw error
  }
  const rules = ruleSnapshot.filter((rule) => rule.enabled && !validateRule(rule))
  const invalidRuleIds = ruleSnapshot.filter((rule) => rule.enabled && validateRule(rule)).map((rule) => rule.id)
  const facts = initialFacts.map((fact) => ({ ...fact }))
  const derived = []
  const fired = new Set()
  const trace = []
  const dependencies = new Map()
  for (const rule of rules) {
    for (const condition of rule.conditions) {
      if (!dependencies.has(condition.field)) dependencies.set(condition.field, new Set())
      dependencies.get(condition.field).add(rule)
    }
  }
  const agenda = [...rules].sort((a, b) => b.priority - a.priority || a.id - b.id)
  const queued = new Set(agenda.map((rule) => rule.id))
  while (agenda.length) {
    const rule = agenda.shift()
    queued.delete(rule.id)
    if (fired.has(rule.id)) continue
    const states = rule.conditions.map((condition) => conditionState(condition, facts))
    const matches = rule.match_mode === 'any'
      ? states.includes('matched') : states.every((state) => state === 'matched')
    if (!matches) continue
    fired.add(rule.id)
    trace.push({
      step: trace.length + 1, rule_id: rule.id, name: rule.name,
      conditions: rule.conditions, states, conclusion: rule.conclusion,
    })
    if (!facts.some((fact) => fact.field_key === 'derived_feature' && fact.value === rule.conclusion)) {
      const fact = { field_key: 'derived_feature', value: rule.conclusion, rule_id: rule.id }
      facts.push(fact)
      derived.push(fact)
      for (const dependent of dependencies.get('derived_feature') || []) {
        if (!fired.has(dependent.id) && !queued.has(dependent.id)) {
          agenda.push(dependent)
          queued.add(dependent.id)
        }
      }
      agenda.sort((a, b) => b.priority - a.priority || a.id - b.id)
    }
  }
  const unsupportedFields = [...new Set(initialFacts.map((fact) => fact.field_key))]
    .filter((field) => !rules.some((rule) => rule.conditions.some((condition) => condition.field === field)
      || rule.provenance?.attributes?.[field] != null
      || (field === 'series' && rule.provenance?.family)))
  const candidates = findCandidates(rules, initialFacts, fired)
  return {
    derived_facts: derived,
    conclusions: [...new Set(trace.map((event) => event.conclusion))],
    candidates,
    explanation: explainCandidates(rules, initialFacts, candidates),
    unsupported_fields: unsupportedFields,
    invalid_rule_ids: invalidRuleIds,
    trace,
    evaluated_rules: rules.length,
  }
}
