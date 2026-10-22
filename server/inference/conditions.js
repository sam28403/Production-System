export const multiValueFields = new Set(['appearance', 'environment', 'derived_feature'])

export function compareValue(actual, operator, expected) {
  if (typeof actual !== typeof expected) return false
  const left = typeof actual === 'string' ? actual.trim() : actual
  const right = typeof expected === 'string' ? expected.trim() : expected
  switch (operator) {
    case 'eq': return left === right
    case 'ne': return left !== right
    case 'contains': return typeof left === 'string' && left.includes(right)
    case 'gt': return left > right
    case 'gte': return left >= right
    case 'lt': return left < right
    case 'lte': return left <= right
    default: return false
  }
}

export function conditionState(condition, facts) {
  const values = facts.filter((fact) => fact.field_key === condition.field).map((fact) => fact.value)
  if (!values.length) return 'unknown'
  const matches = values.map((value) => compareValue(value, condition.operator, condition.value))
  return (condition.operator === 'ne' ? matches.every(Boolean) : matches.some(Boolean))
    ? 'matched' : 'conflict'
}

export function factConflicts(facts) {
  const values = new Map()
  const conflicts = new Set()
  for (const fact of facts) {
    if (multiValueFields.has(fact.field_key)) continue
    if (values.has(fact.field_key) && values.get(fact.field_key) !== fact.value) {
      conflicts.add(fact.field_key)
    }
    values.set(fact.field_key, fact.value)
  }
  return [...conflicts]
}
