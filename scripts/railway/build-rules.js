import { readFileSync, writeFileSync } from 'node:fs'
import { carCount } from './parse-emu.js'
import { validateRule } from '../../server/rules/validation.js'
import { enrichEnvironment } from '../../server/rules/railway-environment.js'

const json = (path) => JSON.parse(readFileSync(path, 'utf8'))
const catalog = json('data/railway/catalog.json')
const wiki = json('data/railway/wikipedia-reference.json')
const weather = json('data/railway/weather-reference.json')
const condition = (field, value) => ({ field, operator: 'eq', value })
const comparisons = []

function compare(model, reference) {
  const differences = []
  if (!reference) return differences
  for (const field of ['design_speed', 'operating_speed', 'formation']) {
    const a = model.attributes[field]
    const b = reference[field]
    if (a != null && b != null && a !== b) differences.push({ field, emu: a, wikipedia: b })
  }
  comparisons.push({ model: model.name, wikipedia_model: reference.wiki_name || reference.name, differences })
  return differences
}

function build(model, detailAvailable) {
  const reference = wiki.rows.find((row) => row.name === model.name)
  const traits = wiki.families[model.family]
  const titleMatches = detailAvailable && model.detail_name === model.name
  const confirmed = Boolean(titleMatches)
  const isPrototype = /样车|试制|实验车/.test(model.name)
  const isExport = /乌兹别克斯坦|跨国/.test(model.name)
  const attributes = confirmed ? { ...model.attributes } : {}
  const differences = confirmed ? compare(model, reference) : []
  if (!confirmed) {
    const formation = model.catalog_values.match(/\b\d+M(?:\d+T)?\b/)?.[0]
    if (formation) Object.assign(attributes, { formation, car_count: carCount(formation) })
  }
  const conditions = Object.entries(attributes)
    .filter(([field, value]) => value != null && field !== 'test_speed'
      && !(isPrototype && field === 'operating_speed'))
    .map(([field, value]) => condition(field, value))
  if (confirmed && traits) {
    conditions.push(condition('traction', traits.traction))
    if (!isPrototype && !isExport) conditions.push(condition('brand', traits.brand))
  }
  if (isPrototype) conditions.push(condition('service_status', '试验样车'))
  if (!conditions.length) conditions.push(condition('series', model.family))
  const issue = !detailAvailable ? '目录无详情页'
    : !titleMatches ? `目录名 ${model.name}，详情名 ${model.detail_name}` : null
  const status = issue ? '待核对' : '详情已核对'
  const rule = {
    name: `${model.name} 候选识别`,
    conditions,
    conclusion: model.name,
    match_mode: 'all',
    priority: 10,
    enabled: confirmed,
    source_url: model.source_url || catalog.catalog_url,
    notes: `采集日期：2026-10-22；资料状态：${status}。${issue || ''}`
      + `\n维基百科：${wiki.source_url}`,
    import_key: `china-emu:${model.name}`,
    provenance: {
      model: model.name,
      family: model.family,
      captured_at: catalog.collected_at,
      primary_source: model.source_url || catalog.catalog_url,
      wikipedia_source: wiki.source_url,
      wikipedia_level: reference ? 'model' : 'family',
      wikipedia_reference_name: reference?.wiki_name || reference?.name || model.family,
      attributes,
      raw_parameters: confirmed ? model.raw_parameters : {},
      source_differences: differences,
      issue,
      source_status: model.catalog_values,
    },
  }
  const error = validateRule(rule)
  if (error) throw new Error(`${model.name}: ${error}`)
  return enrichEnvironment(rule, weather).rule
}

export function buildRules() {
  const names = new Set()
  const rules = []
  const excluded = []
  for (const model of catalog.models) {
    if (names.has(model.name)) throw new Error(`Duplicate detailed model: ${model.name}`)
    names.add(model.name)
    rules.push(build(model, true))
  }
  for (const entry of catalog.entries.filter((item) => !item.source_url)) {
    if (entry.name.includes('*') || names.has(entry.name)) {
      excluded.push({ name: entry.name, reason: entry.name.includes('*') ? '型号通配占位符' : '重复目录名称' })
      continue
    }
    names.add(entry.name)
    rules.push(build(entry, false))
  }
  return { rules, excluded, comparisons }
}

const bundle = buildRules()
writeFileSync('data/railway/rules.json', JSON.stringify(bundle, null, 2) + '\n')
console.log(JSON.stringify({
  rules: bundle.rules.length,
  enabled: bundle.rules.filter((rule) => rule.enabled).length,
  pending: bundle.rules.filter((rule) => !rule.enabled).map((rule) => rule.conclusion),
  modelComparisons: bundle.comparisons.length,
  conflicts: bundle.comparisons.filter((item) => item.differences.length).length,
  excluded: bundle.excluded,
}, null, 2))
