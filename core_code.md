# 推理核心算法

本文件只记录车型识别推理所需的算法。实现由规则匹配、事实冲突检测、正向
推导、候选车型筛选和过程解释组成。完整代码按项目源文件拆分，放在本文末尾。

## 推理流程

1. 检查输入事实：单值特征不能同时有不同取值；外观、环境和推导特征允许多值。
2. 丢弃停用或无效规则，并按优先级从高到低、编号从小到大建立待处理队列。
3. 逐条计算每个规则条件的状态。缺少事实为“未知”，条件不匹配为“冲突”；
   `all` 要求所有条件满足，`any` 只要求至少一个条件满足。
4. 命中规则后记录推理轨迹，并把结论作为 `derived_feature` 事实加入事实集。
   只重新排入依赖推导特征的规则，直到队列为空。
5. 根据规则来源中的车型信息和输入事实计算候选车型。存在冲突证据的车型被
   排除；没有冲突且至少有一项匹配证据的车型保留。
6. 返回推导事实、结论、候选车型、逐项解释、无效规则与未支持特征。

## 条件与事实判断

`server/inference/conditions.js` 定义比较运算、条件三态和事实冲突。`ne` 要求
同一字段的所有事实都不等于目标值；其他运算符只要有一个值匹配即可。

## 候选车型判断

`server/inference/candidates.js` 根据每条车型规则的来源属性判断输入证据：
匹配计数为零或存在冲突时不列为候选；其余按匹配数量降序排列，并区分完全
支持与仍有未知项的候选。`server/inference/explanation.js` 按输入事实顺序
逐步记录筛选前后车型数量、排除项和未知项。

## 完整算法

以下为本项目推理算法的完整实现，按源文件分别列出。规则完整性检查由
`server/rules/validation.js` 的 `validateRule` 提供；算法的字段与比较定义由
`shared/condition-validation.js` 和 `shared/rule-fields.js` 提供。

### `server/inference/engine.js`

```js
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

  const rules = ruleSnapshot.filter(
    (rule) => rule.enabled && !validateRule(rule),
  )
  const invalidRuleIds = ruleSnapshot
    .filter((rule) => rule.enabled && validateRule(rule))
    .map((rule) => rule.id)
  const facts = initialFacts.map((fact) => ({ ...fact }))
  const derived = []
  const fired = new Set()
  const trace = []
  const dependencies = new Map()

  for (const rule of rules) {
    for (const condition of rule.conditions) {
      if (!dependencies.has(condition.field)) {
        dependencies.set(condition.field, new Set())
      }
      dependencies.get(condition.field).add(rule)
    }
  }

  const agenda = [...rules].sort(
    (a, b) => b.priority - a.priority || a.id - b.id,
  )
  const queued = new Set(agenda.map((rule) => rule.id))

  while (agenda.length) {
    const rule = agenda.shift()
    queued.delete(rule.id)
    if (fired.has(rule.id)) continue

    const states = rule.conditions.map(
      (condition) => conditionState(condition, facts),
    )
    const matches = rule.match_mode === 'any'
      ? states.includes('matched')
      : states.every((state) => state === 'matched')
    if (!matches) continue

    fired.add(rule.id)
    trace.push({
      step: trace.length + 1,
      rule_id: rule.id,
      name: rule.name,
      conditions: rule.conditions,
      states,
      conclusion: rule.conclusion,
    })

    const conclusionExists = facts.some((fact) =>
      fact.field_key === 'derived_feature'
      && fact.value === rule.conclusion)
    if (conclusionExists) continue

    const fact = {
      field_key: 'derived_feature',
      value: rule.conclusion,
      rule_id: rule.id,
    }
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

  const unsupportedFields = [...new Set(
    initialFacts.map((fact) => fact.field_key),
  )].filter((field) => !rules.some((rule) =>
    rule.conditions.some((condition) => condition.field === field)
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
```

### `server/inference/conditions.js`

```js
export const multiValueFields = new Set([
  'appearance',
  'environment',
  'derived_feature',
])

export function compareValue(actual, operator, expected) {
  if (typeof actual !== typeof expected) return false

  const left = typeof actual === 'string' ? actual.trim() : actual
  const right = typeof expected === 'string' ? expected.trim() : expected

  switch (operator) {
    case 'eq': return left === right
    case 'ne': return left !== right
    case 'contains':
      return typeof left === 'string' && left.includes(right)
    case 'gt': return left > right
    case 'gte': return left >= right
    case 'lt': return left < right
    case 'lte': return left <= right
    default: return false
  }
}

export function conditionState(condition, facts) {
  const values = facts
    .filter((fact) => fact.field_key === condition.field)
    .map((fact) => fact.value)

  if (!values.length) return 'unknown'

  const matches = values.map((value) =>
    compareValue(value, condition.operator, condition.value))
  const matched = condition.operator === 'ne'
    ? matches.every(Boolean)
    : matches.some(Boolean)

  return matched ? 'matched' : 'conflict'
}

export function factConflicts(facts) {
  const values = new Map()
  const conflicts = new Set()

  for (const fact of facts) {
    if (multiValueFields.has(fact.field_key)) continue

    if (values.has(fact.field_key)
      && values.get(fact.field_key) !== fact.value) {
      conflicts.add(fact.field_key)
    }
    values.set(fact.field_key, fact.value)
  }

  return [...conflicts]
}
```

### `server/inference/candidates.js`

```js
import { compareValue } from './conditions.js'

export function evidenceFor(fact, rule) {
  const expected = fact.field_key === 'series'
    ? rule.provenance?.family
    : rule.provenance?.attributes?.[fact.field_key]

  if (['environment', 'appearance'].includes(fact.field_key)
    && Array.isArray(expected)) {
    return expected.includes(fact.value) ? 'matched' : 'unknown'
  }

  const related = rule.conditions.filter(
    (condition) => condition.field === fact.field_key,
  )
  if (related.length) {
    const matches = related.map((condition) =>
      compareValue(fact.value, condition.operator, condition.value))
    const matched = rule.match_mode === 'any'
      ? matches.some(Boolean)
      : matches.every(Boolean)
    return matched ? 'matched' : 'conflict'
  }

  if (expected === null || expected === undefined) return 'unknown'
  const values = Array.isArray(expected) ? expected : [expected]
  return values.some((value) => compareValue(fact.value, 'eq', value))
    ? 'matched'
    : 'conflict'
}

export function findCandidates(rules, initialFacts, firedIds) {
  const candidates = []

  for (const rule of rules.filter((item) => item.provenance?.model)) {
    const evidence = initialFacts.map((fact) => ({
      field: fact.field_key,
      value: fact.value,
      status: evidenceFor(fact, rule),
    }))

    if (evidence.some((item) => item.status === 'conflict')) continue

    const matched = evidence.filter(
      (item) => item.status === 'matched',
    ).length
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

  return candidates.sort((a, b) =>
    b.matched - a.matched || a.model.localeCompare(b.model))
}
```

### `server/inference/explanation.js`

```js
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
      step: index + 1,
      field: fact.field_key,
      value: fact.value,
      before,
      remaining: remaining.length,
      excluded,
      unknown,
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
          ...condition,
          state: conditionState(condition, initialFacts),
        })),
      }
    }),
  }
}
```
