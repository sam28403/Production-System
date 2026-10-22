import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { openDatabase } from '../database.js'
import { createApp } from '../app.js'

const fact = { name: '八辆编组', field_key: 'car_count', value: 8, source_url: '', notes: '' }

test('事实 CRUD、重复校验、知识库隔离、统计与持久化', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'production-facts-'))
  const path = join(directory, 'test.sqlite')
  const db = openDatabase(path)
  db.prepare('INSERT INTO knowledge_bases (id, name) VALUES (1, ?), (2, ?)').run('铁路', '其他')
  const server = createApp(db).listen(0, '127.0.0.1')
  await new Promise((resolve) => server.once('listening', resolve))
  const origin = `http://127.0.0.1:${server.address().port}/api`
  const url = `${origin}/knowledge-bases/1/facts`
  const send = (target, method, body) => fetch(target, {
    method, headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  try {
    const invalid = [
      { ...fact, name: 'a'.repeat(81) },
      { ...fact, field_key: 'unknown' },
      { ...fact, value: '8' },
      { ...fact, value: 0 },
      { ...fact, value: 8.5 },
      { ...fact, value: null },
      { ...fact, field_key: 'design_speed', value: -1 },
      { ...fact, field_key: 'appearance', value: ' ' },
      { ...fact, field_key: 'appearance', value: {} },
      { ...fact, source_url: 'javascript:alert(1)' },
      { ...fact, source_url: 'not a url' },
      { ...fact, notes: 'a'.repeat(1001) },
    ]
    for (const body of invalid) assert.equal((await send(url, 'POST', body)).status, 400)
    const response = await send(url, 'POST', fact)
    assert.equal(response.status, 201)
    const created = await response.json()
    assert.equal(created.value, 8)
    assert.ok(created.created_at)
    assert.ok(created.updated_at)
    assert.equal((await send(url, 'POST', { ...fact, name: '另一个名称' })).status, 409)
    assert.equal((await send(url, 'POST', { ...fact, value: 16 })).status, 409)
    // Alternative values can coexist in the reusable fact library.
    assert.equal((await send(url, 'POST', { ...fact, name: '', value: 16 })).status, 201)
    for (const method of ['GET', 'PUT', 'DELETE']) {
      assert.equal((await send(`${origin}/knowledge-bases/2/facts/${created.id}`, method,
        method === 'PUT' ? fact : undefined)).status, 404)
    }
    const edited = { ...fact, name: '十七辆编组', value: 17, notes: '已修改' }
    const update = await send(`${url}/${created.id}`, 'PUT', edited)
    assert.equal(update.status, 200)
    assert.equal((await update.json()).value, 17)
    const duplicateEdit = await send(`${url}/${created.id}`, 'PUT', { ...edited, value: 16 })
    assert.equal(duplicateEdit.status, 409)
    assert.equal((await fetch(`${url}/${created.id}`).then((r) => r.json())).value, 17)
    const text = await send(url, 'POST', {
      ...fact, name: '', field_key: 'formation', value: ' 4M4T ',
    })
    assert.equal(text.status, 201)
    assert.equal((await text.json()).value, '4M4T')
    assert.equal((await fetch(`${origin}/overview`).then((r) => r.json())).facts, 3)
    const reopened = openDatabase(path)
    assert.equal(JSON.parse(reopened.prepare('SELECT value_json FROM facts WHERE id = ?').get(created.id).value_json), 17)
    reopened.close()
    assert.equal((await fetch(`${origin}/knowledge-bases/999/facts`)).status, 404)
    assert.equal((await fetch(`${url}/invalid`)).status, 400)
    assert.equal((await send(`${url}/${created.id}`, 'DELETE')).status, 204)
    assert.equal((await fetch(`${url}/${created.id}`)).status, 404)
    assert.equal((await fetch(url).then((r) => r.json())).length, 2)
    await send(`${origin}/knowledge-bases/1`, 'DELETE')
    assert.equal(db.prepare('SELECT count(*) AS n FROM facts').get().n, 0)
  } finally {
    await new Promise((resolve) => server.close(resolve))
    db.close()
    rmSync(directory, { recursive: true, force: true })
  }
})

test('旧版仅含名称的事实可无损升级，缺失特征值保留为空', () => {
  const directory = mkdtempSync(join(tmpdir(), 'production-facts-migration-'))
  const path = join(directory, 'legacy.sqlite')
  const legacy = new DatabaseSync(path)
  legacy.exec(`
    CREATE TABLE knowledge_bases (id INTEGER PRIMARY KEY, name TEXT NOT NULL);
    CREATE TABLE facts (
      id INTEGER PRIMARY KEY, knowledge_base_id INTEGER NOT NULL, name TEXT NOT NULL,
      UNIQUE(knowledge_base_id, name)
    );
    INSERT INTO knowledge_bases VALUES (1, '历史知识库');
    INSERT INTO facts VALUES (1, 1, '旧事实');
    PRAGMA user_version = 3;
  `)
  legacy.close()
  try {
    const upgraded = openDatabase(path)
    const row = upgraded.prepare('SELECT * FROM facts WHERE id = 1').get()
    assert.equal(row.name, '旧事实')
    assert.equal(row.field_key, null)
    assert.equal(row.value_json, null)
    assert.equal(upgraded.prepare('PRAGMA user_version').get().user_version, 5)
    upgraded.close()
    const reopened = openDatabase(path)
    assert.equal(reopened.prepare('SELECT name FROM facts').get().name, '旧事实')
    reopened.close()
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})
