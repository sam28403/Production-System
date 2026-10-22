import { createHash } from 'node:crypto'
import { formatCondition, ruleFields } from '../../shared/rule-fields.js'

const digest = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const fieldLabel = (field) => ruleFields.find((item) => item.value === field)?.label || field

export function projectKnowledgeBase(db, baseId) {
  const nodes = new Map()
  const edges = new Map()
  const addNode = (kind, key, title, properties = {}) => {
    const uid = `${baseId}:${kind}:${digest(key).slice(0, 32)}`
    nodes.set(uid, { uid, kb_id: baseId, kind, title, ...properties })
    return uid
  }
  const connect = (source, type, target) => {
    const uid = digest([baseId, source, type, target])
    edges.set(uid, { uid, kb_id: baseId, source, target, type })
  }
  const feature = (field, value) => addNode('Feature', [field, value],
    `${fieldLabel(field)}：${value}`, { field, value: JSON.stringify(value) })
  const source = (url) => addNode('Source', url, new URL(url).hostname, { source_url: url })
  const validUrl = (url) => {
    try { return ['http:', 'https:'].includes(new URL(url).protocol) } catch { return false }
  }
  const rules = db.prepare('SELECT * FROM rules WHERE knowledge_base_id = ? ORDER BY id').all(baseId)
  for (const rule of rules) {
    const provenance = JSON.parse(rule.provenance)
    const ruleNode = addNode('Rule', rule.id, rule.name, {
      rule_id: rule.id, enabled: Boolean(rule.enabled), match_mode: rule.match_mode,
      priority: rule.priority, conclusion: rule.conclusion,
    })
    let model
    if (provenance?.model) {
      model = addNode('Model', provenance.model, provenance.model, {
        verified: !provenance.issue, source_url: rule.source_url,
      })
      connect(ruleNode, 'CONCLUDES', model)
      if (provenance.family) {
        connect(model, 'BELONGS_TO', addNode('Series', provenance.family, provenance.family))
      }
      // A rule condition is not automatically a verified property of its conclusion.
      if (!provenance.issue && rule.enabled) {
        for (const [field, value] of Object.entries(provenance.attributes || {})) {
          if (value == null) continue
          for (const item of Array.isArray(value) ? value : [value]) {
            connect(model, 'HAS_FEATURE', feature(field, item))
          }
        }
      }
    } else {
      connect(ruleNode, 'CONCLUDES', addNode('Conclusion', rule.conclusion, rule.conclusion))
    }
    for (const [index, condition] of JSON.parse(rule.conditions).entries()) {
      const conditionNode = addNode('Condition', [rule.id, index], formatCondition(condition), {
        field: condition.field, operator: condition.operator, value: JSON.stringify(condition.value),
      })
      connect(ruleNode, 'HAS_CONDITION', conditionNode)
      connect(conditionNode, 'COMPARES', feature(condition.field, condition.value))
    }
    for (const url of new Set([
      rule.source_url, provenance?.wikipedia_source, provenance?.environment_source,
    ].filter(validUrl))) {
      connect(ruleNode, 'HAS_SOURCE', source(url))
      if (model) connect(model, 'DOCUMENTED_BY', source(url))
    }
  }
  const facts = db.prepare('SELECT * FROM facts WHERE knowledge_base_id = ? ORDER BY id').all(baseId)
  for (const fact of facts) {
    const factNode = addNode('Fact', fact.id, fact.name, { fact_id: fact.id })
    if (fact.field_key && fact.value_json !== null) {
      connect(factNode, 'ASSERTS', feature(fact.field_key, JSON.parse(fact.value_json)))
    }
    if (validUrl(fact.source_url)) connect(factNode, 'HAS_SOURCE', source(fact.source_url))
  }
  const graph = { nodes: [...nodes.values()], edges: [...edges.values()] }
  return { ...graph, fingerprint: digest(graph) }
}
