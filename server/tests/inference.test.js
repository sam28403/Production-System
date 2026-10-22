import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { runInference } from '../inference/engine.js'
import { openDatabase } from '../database.js'
import { createApp } from '../app.js'

function rule(id, conditions, conclusion, options = {}) {
  return {
    id, name: `测试规则${id}`, conditions, conclusion, match_mode: 'all', priority: 0,
    enabled: true, source_url: '', notes: '', provenance: {}, ...options,
  }
}
const eq = (field, value) => ({ field, operator: 'eq', value })

test('多轮推理处理优先级、循环、重复结论和停用规则', () => {
  const rules = [
    rule(1, [eq('car_count', 8)], '八辆'),
    rule(2, [eq('derived_feature', '八辆')], '短编组', { priority: 9 }),
    rule(3, [eq('derived_feature', '短编组')], '八辆'),
    rule(4, [eq('car_count', 8)], '不应触发', { enabled: false }),
  ]
  const result = runInference([{ field_key: 'car_count', value: 8 }], rules)
  assert.deepEqual(result.trace.map((step) => step.rule_id), [1, 2, 3])
  assert.deepEqual(result.conclusions, ['八辆', '短编组'])
  assert.equal(result.derived_facts.length, 2)
})

test('缺失字段不满足不等于，OR 和数值比较保留三态逻辑', () => {
  const result = runInference([{ field_key: 'car_count', value: 8 }], [
    rule(1, [{ field: 'brand', operator: 'ne', value: '复兴号' }], '错误结果'),
    rule(2, [eq('brand', '和谐号'), eq('car_count', 8)], '任一满足', { match_mode: 'any' }),
    rule(3, [{ field: 'car_count', operator: 'gte', value: 8 }], '数值比较'),
  ])
  assert.deepEqual(result.conclusions, ['任一满足', '数值比较'])
  assert.deepEqual(result.trace[0].states, ['unknown', 'matched'])
})

test('事实冲突拒绝执行；多个外观或环境事实允许并存', () => {
  assert.throws(() => runInference([
    { field_key: 'car_count', value: 8 }, { field_key: 'car_count', value: 16 },
  ], []), /冲突/)
  assert.doesNotThrow(() => runInference([
    { field_key: 'appearance', value: '红色' }, { field_key: 'appearance', value: '银色' },
  ], []))
})

test('候选筛选排除冲突，不把环境资料缺失当作匹配或概率', () => {
  const rules = [
    rule(1, [eq('car_count', 8), eq('brand', '和谐号')], '测试车型A', {
      provenance: { model: '测试车型A', family: 'CRH测试' },
    }),
    rule(2, [eq('car_count', 16)], '测试车型B', { provenance: { model: '测试车型B' } }),
  ]
  const result = runInference([
    { field_key: 'car_count', value: 8 }, { field_key: 'brand', value: '和谐号' },
    { field_key: 'environment', value: '高寒' },
  ], rules)
  assert.equal(result.candidates.length, 1)
  assert.equal(result.candidates[0].status, 'unverified')
  assert.equal(result.candidates[0].matched, 2)
  assert.equal(result.candidates[0].total, 3)
  assert.equal(result.candidates[0].rule_fired, true)
  assert.deepEqual(result.unsupported_fields, ['environment'])
})

test('实验接口保存事实与规则快照、隔离知识库、导出文件并删除记录', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'production-inference-'))
  const db = openDatabase(':memory:')
  db.prepare('INSERT INTO knowledge_bases (id, name) VALUES (1, ?), (2, ?)').run('测试', '其他')
  db.prepare(`INSERT INTO facts (id, knowledge_base_id, name, field_key, value_json)
    VALUES (1, 1, '八辆', 'car_count', '8'), (2, 2, '另一个库', 'car_count', '16')`).run()
  const testRule = rule(1, [eq('car_count', 8)], '中间特征')
  db.prepare(`INSERT INTO rules (id, knowledge_base_id, name, conditions, conclusion)
    VALUES (1, 1, ?, ?, ?)`).run(testRule.name, JSON.stringify(testRule.conditions), testRule.conclusion)
  const server = createApp(db, { reportDirectory: directory }).listen(0, '127.0.0.1')
  await new Promise((resolve) => server.once('listening', resolve))
  const root = `http://127.0.0.1:${server.address().port}/api/knowledge-bases`
  const send = (path, method, body) => fetch(path, {
    method, headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  try {
    const url = `${root}/1/runs`
    assert.equal((await send(url, 'POST', { fact_ids: [] })).status, 400)
    assert.equal((await send(url, 'POST', { fact_ids: [1, 1] })).status, 400)
    assert.equal((await send(url, 'POST', { fact_ids: [2] })).status, 404)
    const response = await send(url, 'POST', { fact_ids: [1] })
    assert.equal(response.status, 201)
    const run = await response.json()
    assert.equal(run.trace.length, 1)
    assert.equal(run.initial_facts[0].value, 8)
    db.prepare('UPDATE rules SET name = ?, conclusion = ? WHERE id = 1').run('已修改', '新结论')
    db.prepare('DELETE FROM facts WHERE id = 1').run()
    const history = await fetch(`${url}/${run.id}`).then((r) => r.json())
    assert.equal(history.rule_snapshot[0].name, testRule.name)
    assert.equal(history.trace[0].conclusion, testRule.conclusion)
    assert.equal(history.initial_facts[0].value, 8)
    const list = await fetch(url).then((r) => r.json())
    assert.equal(list[0].fact_count, 1)
    assert.equal(list[0].step_count, 1)
    assert.equal((await fetch(`${root}/2/runs/${run.id}`)).status, 404)
    assert.equal((await send(`${root}/2/runs/${run.id}`, 'DELETE')).status, 404)
    for (const format of ['json', 'md']) {
      const report = await fetch(`${url}/${run.id}/report?format=${format}`)
      assert.equal(report.status, 200)
      assert.ok(report.headers.get('content-disposition').includes('attachment'))
      const content = await report.text()
      assert.ok(content.includes('中间特征'))
      assert.equal(readFileSync(join(directory, 'knowledge-base-1', `run-${run.id}.${format}`), 'utf8'), content)
    }
    assert.equal((await fetch(`${url}/${run.id}/report?format=exe`)).status, 400)
    assert.equal((await send(`${url}/${run.id}`, 'DELETE')).status, 204)
    assert.equal((await fetch(`${url}/${run.id}`)).status, 404)
  } finally {
    await new Promise((resolve) => server.close(resolve))
    db.close()
    rmSync(directory, { recursive: true, force: true })
  }
})
