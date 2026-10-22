import { conditionState } from './conditions.js'
import { evidenceFor } from './candidates.js'

export function explainCandidates(rules, initialFacts, candidates) {
  let remaining = rules.filter((rule) => rule.provenance?.model)
  const steps = initialFacts.map((fact, index) => {
    const before = remaining.length
    const excluded = []
    const unknown = []
    remaining = remaining.filter((rule) => {
      const state = evidenceFor(fact, rule)
      if (state === 'unknown') unknown.push(rule.provenance.model)
      if (state === 'conflict') excluded.push(rule.provenance.model)
      return state !== 'conflict'
    })
    return {
      step: index + 1, field: fact.field_key, value: fact.value,
      before, remaining: remaining.length, excluded, unknown,
    }
  })
  return {
    assessed_models: rules.filter((rule) => rule.provenance?.model).length,
    steps,
    candidates: candidates.map((candidate) => {
      const rule = rules.find((item) => item.id === candidate.rule_id)
      return {
        ...candidate,
        rule_name: rule?.name || '',
        match_mode: rule?.match_mode || 'all',
        requirements: (rule?.conditions || []).map((condition) => ({
          ...condition, state: conditionState(condition, initialFacts),
        })),
      }
    }),
  }
}
