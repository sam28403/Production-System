import { mkdirSync, writeFileSync } from 'node:fs'
import { parseCatalog, parseDetail } from './parse-emu.js'
import { catalogUrl, download } from './sources.js'

const entries = parseCatalog(await download(catalogUrl, 'catalog.html'))
const linked = entries.filter((entry) => entry.source_url)
const models = []
const failures = []
let cursor = 0
async function worker() {
  while (cursor < linked.length) {
    const entry = linked[cursor++]
    const filename = entry.source_url.split('/').pop()
    try {
      const html = await download(entry.source_url, filename)
      models.push(parseDetail(html, entry))
    } catch (error) {
      failures.push({ name: entry.name, source_url: entry.source_url, error: error.message })
    }
    if ((models.length + failures.length) % 20 === 0) {
      console.log(`Collected ${models.length + failures.length}/${linked.length}`)
    }
  }
}
if (process.argv.includes('--serial')) await worker()
else await Promise.all([worker(), worker(), worker()])
models.sort((a, b) => a.source_url.localeCompare(b.source_url))
mkdirSync('data/railway', { recursive: true })
writeFileSync('data/railway/catalog.json', JSON.stringify({
  collected_at: new Date().toISOString(),
  catalog_url: catalogUrl,
  entries,
  models,
  failures,
}, null, 2) + '\n')
console.log(JSON.stringify({ entries: entries.length, models: models.length, failures }, null, 2))
if (failures.length) process.exitCode = 1
