import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const catalogUrl = 'https://www.china-emu.cn/Trains/ALL/'
export const wikiUrl = 'https://zh.wikipedia.org/wiki/中國國家鐵路集團動車組列表'
export const cacheDirectory = new URL('../../data/sources/', import.meta.url)

export async function download(url, filename) {
  mkdirSync(cacheDirectory, { recursive: true })
  const path = join(fileURLToPath(cacheDirectory), filename)
  if (existsSync(path)) {
    const cached = readFileSync(path, 'utf8')
    if (!cached.includes('database is locked')) return cached
    unlinkSync(path)
  }
  let error
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(25000),
        headers: { 'User-Agent': 'RailwayCoursework/1.0 (educational data verification)' },
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const html = await response.text()
      if (html.length < 500) throw new Error('Source document is unexpectedly short')
      if (html.includes('database is locked')) throw new Error('Source database temporarily locked')
      writeFileSync(path, html)
      return html
    } catch (cause) {
      error = cause
    }
  }
  throw new Error(`${url}: ${error.message}`)
}
