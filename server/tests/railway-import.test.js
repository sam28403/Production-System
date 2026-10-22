import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { openDatabase } from '../database.js'
import { importRuleBundle } from '../rules/import-bundle.js'
import { validateRule } from '../rules/validation.js'
import { carCount, parseDetail } from '../../scripts/railway/parse-emu.js'

const readJson = (file) => JSON.parse(readFileSync(new URL(`../../data/railway/${file}`, import.meta.url), 'utf8'))
const bundle = readJson('rules.json')
const catalog = readJson('catalog.json')

test('导入资料覆盖全部明确目录型号，资料不足的规则停用', () => {
  const names = new Set(catalog.entries.filter((entry) => !entry.name.includes('*')).map((entry) => entry.name))
  assert.deepEqual(new Set(bundle.rules.map((rule) => rule.conclusion)), names)
  assert.equal(new Set(bundle.rules.map((rule) => rule.import_key)).size, bundle.rules.length)
  for (const rule of bundle.rules) {
    assert.equal(validateRule(rule), null, rule.name)
    assert.ok(rule.source_url.startsWith('https://www.china-emu.cn/'))
    assert.ok(rule.provenance.wikipedia_source.startsWith('https://zh.wikipedia.org/'))
    if (rule.enabled) {
      const source = catalog.models.find((model) => model.name === rule.conclusion)
      assert.ok(source)
      assert.equal(source.name, source.detail_name)
      for (const condition of rule.conditions.filter((item) => item.field.endsWith('_speed'))) {
        assert.equal(condition.value, source.attributes[condition.field], rule.name)
      }
    } else {
      assert.ok(rule.provenance.issue)
    }
  }
  assert.equal(bundle.rules.find((rule) => rule.conclusion === 'CRH5H').enabled, false)
  assert.equal(bundle.rules.find((rule) => rule.conclusion === 'CR450AF').enabled, false)
})

test('批量导入保留其他手工规则，纠正规则编号不变且重复执行不覆盖编辑', () => {
  const db = openDatabase(':memory:')
  try {
    const baseId = Number(db.prepare('INSERT INTO knowledge_bases (name) VALUES (?)').run('中国铁路').lastInsertRowid)
    const id = Number(db.prepare(`
      INSERT INTO rules (knowledge_base_id, name, conditions, conclusion)
      VALUES (?, 'CR400AF系列', '[]', 'CR400AF系列')
    `).run(baseId).lastInsertRowid)
    const manualId = Number(db.prepare(`
      INSERT INTO rules (knowledge_base_id, name, conditions, conclusion)
      VALUES (?, '保留手工规则', '[]', '手工结论')
    `).run(baseId).lastInsertRowid)
    const manualBefore = db.prepare('SELECT * FROM rules WHERE id = ?').get(manualId)
    const result = importRuleBundle(db, baseId, bundle.rules, id)
    assert.equal(result.corrected, 1)
    assert.equal(result.inserted, bundle.rules.length - 1)
    assert.equal(db.prepare('SELECT conclusion FROM rules WHERE id = ?').get(id).conclusion, 'CR400AF')
    assert.deepEqual(db.prepare('SELECT * FROM rules WHERE id = ?').get(manualId), manualBefore)
    db.prepare('UPDATE rules SET notes = ? WHERE id = ?').run('导入后的手工编辑', id)
    const again = importRuleBundle(db, baseId, bundle.rules, id)
    assert.equal(again.inserted, 0)
    assert.equal(again.corrected, 0)
    assert.equal(again.skipped, bundle.rules.length)
    assert.equal(db.prepare('SELECT notes FROM rules WHERE id = ?').get(id).notes, '导入后的手工编辑')
    assert.equal(db.prepare('SELECT count(*) AS n FROM rules').get().n, bundle.rules.length + 1)
  } finally {
    db.close()
  }
})

test('批量写入中途失败时回滚整批数据', () => {
  const db = openDatabase(':memory:')
  try {
    db.prepare('INSERT INTO knowledge_bases (id, name) VALUES (1, ?)').run('测试')
    const first = { ...bundle.rules[0], import_key: 'test:1' }
    const invalid = { ...bundle.rules[1], import_key: 'test:2', provenance: undefined }
    assert.throws(() => importRuleBundle(db, 1, [first, invalid]))
    assert.equal(db.prepare('SELECT count(*) AS n FROM rules').get().n, 0)
  } finally {
    db.close()
  }
})

test('参数解析区分三种速度，不把缺失值或灵活编组强制转换为零', () => {
  const html = `<h2>CR400AF</h2>
    <div class="para"><div class="para-N">350 km/h</div><div class="para-M">设计速度</div></div>
    <div class="para"><div class="para-N">385 km/h</div><div class="para-M">最高实验速度</div></div>
    <div class="para"><div class="para-N">4M4T</div><div class="para-M">编组</div></div>`
  const result = parseDetail(html, { name: 'CR400AF' })
  assert.equal(result.attributes.design_speed, 350)
  assert.equal(result.attributes.test_speed, 385)
  assert.equal(result.attributes.operating_speed, null)
  assert.equal(result.attributes.car_count, 8)
  assert.equal(carCount('6M'), 6)
  assert.equal(carCount('2M17T'), 19)
  assert.equal(carCount('灵活编组'), null)
  assert.equal(carCount('3M5T/灵活编组'), null)
})
