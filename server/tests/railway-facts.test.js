import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { openDatabase } from '../database.js'
import { completeRailwayFacts } from '../facts/railway-seed.js'
import { enrichEnvironment, isColdModel } from '../rules/railway-environment.js'
import { runInference } from '../inference/engine.js'

const weather = JSON.parse(readFileSync('data/railway/weather-reference.json', 'utf8'))
const bundle = JSON.parse(readFileSync('data/railway/rules.json', 'utf8'))

test('高寒识别保留批次变型、CRH5A 例外及资料明确的 GZ 型', () => {
  for (const name of ['CR400AF-G', 'CRH5G(大功率)', 'CRH380BG(统型)', 'CRH5A']) {
    assert.equal(isColdModel(name), true)
  }
  assert.equal(isColdModel('CR400AF'), false)
  const rule = bundle.rules.find((item) => item.conclusion === 'CR400BF-GZ')
  assert.ok(enrichEnvironment(rule, weather).rule.provenance.attributes.environment.includes('高寒'))
  const custom = { ...rule, conditions: [{ field: 'environment', operator: 'ne', value: '高寒' }] }
  assert.equal(enrichEnvironment(custom, weather).conflict, true)
  assert.deepEqual(enrichEnvironment(custom, weather).rule, custom)
})

test('事实补全去重、隔离知识库，保留用户数据及规则编辑，重复执行不新增', () => {
  const db = openDatabase(':memory:')
  try {
    db.prepare('INSERT INTO knowledge_bases (id, name) VALUES (1, ?), (2, ?)').run('铁路', '其他')
    db.prepare(`INSERT INTO facts (knowledge_base_id, name, field_key, value_json, notes)
      VALUES (1, '我的八辆', 'car_count', '8', '用户备注')`).run()
    const before = db.prepare('SELECT * FROM facts').all()
    const insert = db.prepare(`INSERT INTO rules
      (knowledge_base_id, name, conditions, conclusion, priority, enabled, match_mode,
        source_url, notes, provenance) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    for (const source of bundle.rules) {
      const rule = { ...source, priority: 77, notes: '保留此编辑' }
      insert.run(rule.name, JSON.stringify(rule.conditions), rule.conclusion, rule.priority,
        Number(rule.enabled), rule.match_mode, rule.source_url, rule.notes, JSON.stringify(rule.provenance))
    }
    const result = completeRailwayFacts(db, 1, weather)
    assert.ok(result.inserted > 30)
    assert.deepEqual(db.prepare('SELECT * FROM facts WHERE id = 1').get(), before[0])
    assert.equal(db.prepare('SELECT count(*) AS n FROM facts WHERE knowledge_base_id = 2').get().n, 0)
    assert.equal(db.prepare('SELECT count(*) AS n FROM facts WHERE field_key = ?').get('derived_feature').n, 0)
    assert.equal(db.prepare('SELECT count(*) AS n FROM rules WHERE priority != 77 OR notes != ?')
      .get('保留此编辑').n, 0)
    const second = completeRailwayFacts(db, 1, weather)
    assert.equal(second.inserted, 0)
    assert.equal(second.updated_rules.length, 0)
    const profiles = db.prepare('SELECT * FROM rules WHERE enabled = 1').all().map((row) => ({
      ...row, enabled: true, conditions: JSON.parse(row.conditions), provenance: JSON.parse(row.provenance),
    }))
    const inference = runInference([
      { field_key: 'series', value: 'CRH5' }, { field_key: 'environment', value: '高寒' },
    ], profiles)
    assert.deepEqual(inference.unsupported_fields, [])
    assert.ok(inference.candidates.some((item) => item.model === 'CRH5A' && item.status === 'supported'))
    assert.ok(inference.candidates.some((item) => item.model === 'CRH5G' && item.status === 'supported'))
    assert.equal(inference.candidates.some((item) => item.family !== 'CRH5'), false)
  } finally {
    db.close()
  }
})
