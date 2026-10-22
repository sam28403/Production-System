import { test } from 'node:test'
import assert from 'node:assert/strict'
import { answerFactIds, buildQuestions } from '../../shared/inference-questions.js'
import { runInference } from '../inference/engine.js'

const facts = [
  { id: 1, field_key: 'brand', value: '和谐号' },
  { id: 2, field_key: 'car_count', value: 16 },
  { id: 3, field_key: 'car_count', value: 8 },
  { id: 4, field_key: 'environment', value: '高寒' },
  { id: 5, field_key: 'environment', value: '抗风沙' },
  { id: 6, field_key: 'test_speed', value: 380 },
  { id: 7, field_key: 'formation', value: '4M4T' },
  { id: 8, field_key: 'traction', value: '动力分散' },
]

test('问答由大众特征到专业参数排列，全部有效选项按类型排序', () => {
  const questions = buildQuestions([...facts,
    { id: 9, field_key: 'car_count', value: '8' },
    { id: 10, field_key: null, value: null },
    { id: 11, field_key: 'derived_feature', value: '候选结论' },
    { id: 12, field_key: 'car_count', value: 8 },
  ])
  assert.deepEqual(questions.map((question) => question.field), [
    'brand', 'car_count', 'environment', 'traction', 'formation', 'test_speed',
  ])
  assert.deepEqual(questions[1].options.map((option) => option.value), [8, 16])
  assert.equal(questions[2].multiple, true)
  assert.equal(questions[0].multiple, false)
  assert.equal(questions.at(-1).options[0].label, '380 km/h')
})

test('未知答案清除该题全部选择，不向推理传入否定或占位事实', () => {
  const questions = buildQuestions(facts)
  const answers = { brand: 1, car_count: 3, environment: [4, 5], test_speed: null }
  assert.deepEqual(answerFactIds(questions, answers), [1, 3, 4, 5])
  answers.environment = null
  const ids = answerFactIds(questions, answers)
  assert.deepEqual(ids, [1, 3])
  const result = runInference(facts.filter((fact) => ids.includes(fact.id)), [{
    id: 1, name: '高寒候选', enabled: true, priority: 0, match_mode: 'all',
    conditions: [{ field: 'environment', operator: 'eq', value: '高寒' }],
    conclusion: '高寒车型', source_url: '', notes: '',
  }])
  assert.deepEqual(result.conclusions, [])
  assert.deepEqual(answerFactIds(questions, Object.fromEntries(
    questions.map((question) => [question.field, null]),
  )), [])
  assert.deepEqual(answerFactIds(questions, { brand: 999 }), [])
})
