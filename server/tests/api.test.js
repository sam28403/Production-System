import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openDatabase } from '../database.js'
import { createApp } from '../app.js'

test('知识库 API 校验、持久化和删除', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'production-test-'))
  const path = join(directory, 'test.sqlite')
  const db = openDatabase(path)
  const server = createApp(db).listen(0, '127.0.0.1')
  await new Promise((resolve) => server.once('listening', resolve))
  const url = `http://127.0.0.1:${server.address().port}/api`
  try {
    const health = await fetch(`${url}/health`).then((r) => r.json())
    assert.equal(health.database, 'connected')
    const post = (body) => fetch(`${url}/knowledge-bases`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    assert.equal((await post({ name: '  ' })).status, 400)
    assert.equal((await post({ name: 'a'.repeat(41) })).status, 400)
    assert.equal((await post({ name: '测试', description: 'a'.repeat(301) })).status, 400)
    const created = await post({ name: '  设备故障诊断  ', description: '集成测试' })
    assert.equal(created.status, 201)
    const base = await created.json()
    assert.equal(base.name, '设备故障诊断')
    const reopened = openDatabase(path)
    assert.equal(reopened.prepare('SELECT name FROM knowledge_bases').get().name, base.name)
    reopened.close()
    const stats = await fetch(`${url}/overview`).then((r) => r.json())
    assert.deepEqual(stats, { knowledgeBases: 1, rules: 0, facts: 0, runs: 0 })
    db.prepare('INSERT INTO facts (knowledge_base_id, name) VALUES (?, ?)').run(base.id, '无法启动')
    const records = await fetch(`${url}/knowledge-bases`).then((r) => r.json())
    assert.equal(records[0].fact_count, 1)
    assert.equal((await fetch(`${url}/knowledge-bases/${base.id}`, { method: 'DELETE' })).status, 204)
    assert.equal(db.prepare('SELECT count(*) AS n FROM facts').get().n, 0)
    assert.equal((await fetch(`${url}/knowledge-bases/${base.id}`, { method: 'DELETE' })).status, 404)
    assert.equal((await fetch(`${url}/knowledge-bases/invalid`, { method: 'DELETE' })).status, 400)
  } finally {
    await new Promise((resolve) => server.close(resolve))
    db.close()
    rmSync(directory, { recursive: true, force: true })
  }
})
