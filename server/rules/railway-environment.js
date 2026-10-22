// Parenthesized batch names retain the environmental classification of the model body.
export function isColdModel(name) {
  const body = name.replace(/[（(].*$/, '').trim()
  return /^CR(?:H|\d)/.test(body) && (body.endsWith('G') || body === 'CRH5A')
}

export function railwayEnvironment(name, reference) {
  const entry = reference.models.find((model) => model.name === name)
  const values = new Set(entry?.environment || [])
  if (isColdModel(name)) values.add('高寒')
  return [...values]
}

export function enrichEnvironment(rule, reference) {
  const name = rule.provenance?.model
  if (!name || !rule.enabled) return { rule, changed: false, conflict: false }
  const values = railwayEnvironment(name, reference)
  if (!values.length) return { rule, changed: false, conflict: false }
  const current = rule.conditions.filter((condition) => condition.field === 'environment')
  // Preserve custom conditions that cannot safely be combined with positive AND facts.
  if (rule.match_mode !== 'all' || current.some((condition) =>
    !['eq', 'contains'].includes(condition.operator) || !values.includes(condition.value),
  )) return { rule, changed: false, conflict: true }
  const conditions = [...rule.conditions]
  for (const value of values) {
    if (!current.some((condition) => condition.value === value)) {
      conditions.push({ field: 'environment', operator: 'eq', value })
    }
  }
  const updated = {
    ...rule,
    conditions,
    provenance: {
      ...rule.provenance,
      attributes: { ...rule.provenance.attributes, environment: values },
      environment_source: reference.source_url,
    },
  }
  return { rule: updated, changed: JSON.stringify(updated) !== JSON.stringify(rule), conflict: false }
}
