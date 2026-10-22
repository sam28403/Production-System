import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { openDatabase } from '../../server/database.js'
import { importRuleBundle } from '../../server/rules/import-bundle.js'

function argument(name) {
  const index = process.argv.indexOf(name)
  return index < 0 ? null : Number(process.argv[index + 1])
}

const baseId = argument('--base-id')
const correctionId = argument('--correct-rule-id')
if (!Number.isSafeInteger(baseId) || baseId < 1) {
  throw new Error('Use --base-id <knowledge base id> to select the target explicitly')
}
if (correctionId !== null && (!Number.isSafeInteger(correctionId) || correctionId < 1)) {
  throw new Error('The correction rule id must be a positive integer')
}
const bundle = JSON.parse(readFileSync('data/railway/rules.json', 'utf8'))
const db = openDatabase()
try {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  mkdirSync('data/backups', { recursive: true })
  const backupPath = resolve(`data/backups/before-railway-import-${stamp}.sqlite`)
  db.prepare('VACUUM INTO ?').run(backupPath)
  const result = importRuleBundle(db, baseId, bundle.rules, correctionId)
  const counts = db.prepare(`
    SELECT count(*) AS total, sum(enabled) AS enabled, sum(1 - enabled) AS disabled
    FROM rules WHERE knowledge_base_id = ?
  `).get(baseId)
  const report = { imported_at: new Date().toISOString(), baseId, backupPath, ...result, counts }
  writeFileSync(`data/backups/import-${stamp}.json`, JSON.stringify(report, null, 2) + '\n')
  writeFileSync('data/railway/import-result.json', JSON.stringify({
    imported_at: report.imported_at, baseId, inserted: result.inserted,
    corrected: result.corrected, skipped: result.skipped, counts,
  }, null, 2) + '\n')
  console.log(JSON.stringify(report, null, 2))
} finally {
  db.close()
}
