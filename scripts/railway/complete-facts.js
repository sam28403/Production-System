import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { openDatabase } from '../../server/database.js'
import { completeRailwayFacts } from '../../server/facts/railway-seed.js'

const index = process.argv.indexOf('--base-id')
const baseId = index < 0 ? null : Number(process.argv[index + 1])
if (!Number.isSafeInteger(baseId) || baseId < 1) throw new Error('Use --base-id <id>')
const weather = JSON.parse(readFileSync('data/railway/weather-reference.json', 'utf8'))
const db = openDatabase()
try {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  mkdirSync('data/backups', { recursive: true })
  const backup = resolve(`data/backups/before-facts-${stamp}.sqlite`)
  db.prepare('VACUUM INTO ?').run(backup)
  const before = db.prepare('SELECT * FROM facts WHERE knowledge_base_id = ?').all(baseId)
  const result = completeRailwayFacts(db, baseId, weather)
  for (const fact of before) {
    const after = db.prepare('SELECT * FROM facts WHERE id = ?').get(fact.id)
    if (JSON.stringify(after) !== JSON.stringify(fact)) throw new Error(`Original fact changed: ${fact.id}`)
  }
  const counts = db.prepare(`SELECT field_key, count(*) AS total FROM facts
    WHERE knowledge_base_id = ? GROUP BY field_key`).all(baseId)
  const report = { completed_at: new Date().toISOString(), baseId, backup, ...result, counts }
  writeFileSync('data/railway/facts-result.json', JSON.stringify(report, null, 2) + '\n')
  console.log(JSON.stringify(report, null, 2))
} finally {
  db.close()
}
