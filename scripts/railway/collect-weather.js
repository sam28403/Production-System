import { load } from 'cheerio'
import { writeFileSync } from 'node:fs'
import { download } from './sources.js'

const source = 'https://www.china-emu.cn/Trains/Type/Weather-Proof/'
const html = await download(source, 'weather-proof.html')
const $ = load(html)
const models = $('.series-list-Model-word').toArray().map((element) => {
  const card = $(element).closest('.shadow')
  const environments = []
  if (card.find('.cov .bi-snow').length) environments.push('高寒')
  if (card.find('.cov .bi-wind').length) environments.push('抗风沙')
  if (card.find('.cov img[src*="mountain"]').length) environments.push('高海拔')
  return {
    name: $(element).text().trim(),
    source_url: new URL($(element).closest('a').attr('href'), source).href,
    environment: environments,
  }
}).filter((model) => /^CR(?:H|\d)/.test(model.name) && !model.name.includes('*'))
writeFileSync('data/railway/weather-reference.json', JSON.stringify({
  source_url: source, collected_at: new Date().toISOString(), models,
}, null, 2) + '\n')
console.log(JSON.stringify({ models: models.length, cold: models.filter(
  (model) => model.environment.includes('高寒'),
).length }))
