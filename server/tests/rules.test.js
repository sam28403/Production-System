import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createApp } from '../app.js'
import { openDatabase } from '../database.js'
import { migrateDatabase } from '../migrations.js'

const validRule = {
  name: '编组速度组合',
  conditions: [
    { field: 'design_speed', operator: 'eq', value: 350 },
    { field: 'car_count', operator: 'eq', value: 8 },
  ],
  conclusion: '测试候选',
  match_mode: 'all',
  priority: 10,
  enabled: true,
  source_url: 'https://www.china-emu.cn/Trains/ALL/',
  notes: '仅用于测试，不构成真实车型规则。',
}

test('规则增删改查、校验、知识库隔离及持久化', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'production-rules-'))
  const path = join(directory, 'test.sqlite')
  const db = openDatabase(path)
  const first = Number(db.prepare('INSERT INTO knowledge_bases (name) VALUES (?)').run('CR').lastInsertRowid)
  const second = Number(db.prepare('INSERT INTO knowledge_bases (name) VALUES (?)').run('CRH').lastInsertRowid)
  const server = createApp(db).listen(0, '127.0.0.1')
  await new Promise((resolve) => server.once('listening', resolve))
  const origin = `http://127.0.0.1:${server.address().port}/api/knowledge-bases`
  const url = `${origin}/${first}/rules`
  const send = (target, method, body) => fetch(target, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  try {
    const invalid = [
      { ...validRule, name: '  ' },
      { ...validRule, conditions: [] },
      { ...validRule, conclusion: '' },
      { ...validRule, conditions: [{ field: 'design_speed', operator: 'eq', value: '350' }] },
      { ...validRule, conditions: [{ field: 'design_speed', operator: 'contains', value: 350 }] },
      { ...validRule, conditions: [{ field: 'appearance', operator: 'gt', value: '红色' }] },
      { ...validRule, conditions: [{ field: 'car_count', operator: 'eq', value: 8.5 }] },
      { ...validRule, conditions: [{ field: 'series', operator: 'eq', value: '  ' }] },
      { ...validRule, conditions: [{ field: 'unknown', operator: 'eq', value: 'a' }] },
      { ...validRule, source_url: 'javascript:alert(1)' },
      { ...validRule, priority: 1.5 },
      { ...validRule, enabled: 'false' },
      { ...validRule, match_mode: 'none' },
    ]
    for (const body of invalid) assert.equal((await send(url, 'POST', body)).status, 400)
    const response = await send(url, 'POST', validRule)
    assert.equal(response.status, 201)
    const created = await response.json()
    assert.deepEqual(created.conditions, validRule.conditions)
    assert.equal(created.enabled, true)
    assert.equal((await fetch(`${url}/${created.id}`).then((r) => r.json())).name, validRule.name)
    for (const method of ['GET', 'PUT', 'DELETE']) {
      const isolated = await send(`${origin}/${second}/rules/${created.id}`, method,
        method === 'PUT' ? validRule : undefined)
      assert.equal(isolated.status, 404)
    }
    const edited = {
      ...validRule, name: '修改后的规则', match_mode: 'any', enabled: false,
      conditions: [{ field: 'appearance', operator: 'contains', value: '银色' }],
    }
    assert.equal((await send(`${url}/${created.id}`, 'PUT', edited)).status, 200)
    assert.equal((await send(`${url}/${created.id}`, 'PUT', { ...edited, conditions: [] })).status, 400)
    const listed = await fetch(url).then((r) => r.json())
    assert.equal(listed[0].name, edited.name)
    assert.equal(listed[0].enabled, false)
    assert.equal(listed[0].match_mode, 'any')
    assert.ok(listed[0].updated_at)
    const reopened = openDatabase(path)
    assert.equal(reopened.prepare('SELECT name FROM rules').get().name, edited.name)
    assert.equal(reopened.prepare('PRAGMA user_version').get().user_version, 5)
    reopened.close()
    assert.equal((await fetch(`${origin}/99999/rules`)).status, 404)
    assert.equal((await fetch(`${url}/bad`)).status, 400)
    assert.equal((await send(`${url}/${created.id}`, 'DELETE')).status, 204)
    assert.deepEqual(await fetch(url).then((r) => r.json()), [])
    assert.equal((await fetch(`${url}/${created.id}`)).status, 404)
  } finally {
    await new Promise((resolve) => server.close(resolve))
    db.close()
    rmSync(directory, { recursive: true, force: true })
  }
})

test('旧版数据库升级保留规则，重复启动不会重复迁移', () => {
  const db = new DatabaseSync(':memory:')
  db.exec(`
    CREATE TABLE rules (
      id INTEGER PRIMARY KEY, knowledge_base_id INTEGER NOT NULL,
      name TEXT NOT NULL, conditions TEXT NOT NULL, conclusion TEXT NOT NULL,
      priority INTEGER NOT NULL DEFAULT 0, enabled INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE facts (
      id INTEGER PRIMARY KEY, knowledge_base_id INTEGER NOT NULL, name TEXT NOT NULL,
      UNIQUE(knowledge_base_id, name)
    );
    CREATE TABLE inference_runs (id INTEGER PRIMARY KEY);
    INSERT INTO rules (id, knowledge_base_id, name, conditions, conclusion)
      VALUES (1, 1, '旧规则', '[]', '旧结论');
    PRAGMA user_version = 1;
  `)
  try {
    // Reuse the real migration entry point against an existing v1 schema.
    const { name, match_mode } = migrateAndRead(db)
    assert.equal(name, '旧规则')
    assert.equal(match_mode, 'all')
    assert.equal(migrateAndRead(db).name, '旧规则')
  } finally {
    db.close()
  }
})

function migrateAndRead(db) {
  migrateDatabase(db)
  return db.prepare('SELECT * FROM rules WHERE id = 1').get()
}
