import { test } from 'node:test'
import assert from 'node:assert/strict'
import { runInference } from '../inference/engine.js'
import { serializeRun } from '../inference/repository.js'
import { buildReport } from '../inference/report.js'

const rules = [8, 16].map((count, index) => ({
  id: index + 1, name: `车型${count}`, conclusion: `车型${count}`, priority: 0,
  enabled: true, match_mode: 'all', source_url: '', notes: '',
  conditions: [
    { field: 'car_count', operator: 'eq', value: count },
    { field: 'brand', operator: 'eq', value: '和谐号' },
  ],
  provenance: { model: `车型${count}`, family: '测试系列' },
}))

test('没有完整命中时仍记录候选筛选及未知条件，资料不足不作否定', () => {
  const facts = [
    { field_key: 'car_count', value: 8 }, { field_key: 'environment', value: '高寒' },
  ]
  const result = runInference(facts, rules)
  assert.equal(result.trace.length, 0)
  assert.equal(result.candidates.length, 1)
  assert.equal(result.explanation.steps[0].before, 2)
  assert.deepEqual(result.explanation.steps[0].excluded, ['车型16'])
  assert.equal(result.explanation.steps[1].remaining, 1)
  assert.deepEqual(result.explanation.steps[1].unknown, ['车型8'])
  const candidate = result.explanation.candidates[0]
  assert.deepEqual(candidate.requirements.map((item) => item.state), ['matched', 'unknown'])
  assert.equal(candidate.rule_fired, false)
  assert.equal(candidate.status, 'unverified')
})

test('历史实验从保存的快照补充过程，导出包含筛选步骤', () => {
  const initialFacts = [{ field_key: 'car_count', value: 8 }]
  const result = runInference(initialFacts, rules)
  delete result.explanation
  const run = serializeRun({
    id: 1, knowledge_base_id: 1, created_at: '2026-10-22',
    initial_facts: JSON.stringify(initialFacts), rule_snapshot: JSON.stringify(rules),
    conclusions: JSON.stringify(result), trace: '[]',
  })
  assert.equal(run.result.explanation.steps[0].remaining, 1)
  assert.ok(buildReport(run, 'md').includes('核对 2 个车型，排除 1 个，保留 1 个'))
  assert.ok(buildReport(run, 'md').includes('车型16'))
})
