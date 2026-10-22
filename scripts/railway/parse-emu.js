import { load } from 'cheerio'
import { catalogUrl } from './sources.js'

const clean = (value) => value.replace(/\s+/g, ' ').trim()

export function familyOf(name) {
  return name.match(/CRH380[A-D]|CRH[12356]|CR(?:450|400|300)(?:AF|BF)|CR220J|CR200J/)?.[0] || null
}

export function parseCatalog(html) {
  const $ = load(html)
  return $('.series-list-item-word').toArray().map((element) => {
    const card = $(element).closest('.series-list-box')
    const group = $(element).closest('.shadow').find('a.font-mid').first()
    const name = clean($(element).text())
    const href = $(element).attr('href')
    return {
      name,
      family: familyOf(clean(group.text())) || familyOf(name),
      source_url: href ? new URL(href, catalogUrl).href : null,
      catalog_values: card.find('.series-list-item-word2').text().replace(/\s+/g, ' ').trim(),
    }
  }).filter((item) => /^CR(?:H|\d)/.test(item.name))
}

function singleNumber(value) {
  const match = value?.match(/^(\d+(?:\.\d+)?)\s*(?:km\/h)?$/i)
  return match ? Number(match[1]) : null
}

export function carCount(formation) {
  if (!/^\d+(?:\.\d+)?M(?:\d+(?:\.\d+)?T)?$/.test(formation || '')) return null
  const count = [...formation.matchAll(/(\d+(?:\.\d+)?)[MT]/g)]
    .reduce((total, match) => total + Number(match[1]), 0)
  return Number.isInteger(count) ? count : null
}

export function parseDetail(html, entry) {
  const $ = load(html)
  const parameters = {}
  $('.para').each((index, element) => {
    const label = clean($(element).find('.para-M').text())
    if (label && parameters[label] === undefined) {
      parameters[label] = clean($(element).find('.para-N').text())
    }
  })
  const name = clean($('h2').first().text())
  if (!/^CR(?:H|\d)/.test(name)) throw new Error('Model detail title is missing')
  const formation = parameters['编组']?.replace(/\s+/g, '') || null
  return {
    ...entry,
    detail_name: name,
    attributes: {
      design_speed: singleNumber(parameters['设计速度']),
      operating_speed: singleNumber(parameters['运营速度']),
      test_speed: singleNumber(parameters['最高实验速度']),
      formation,
      car_count: carCount(formation),
    },
    raw_parameters: Object.fromEntries([
      '设计速度', '运营速度', '最高实验速度', '编组', '工作温度',
    ].filter((key) => parameters[key]).map((key) => [key, parameters[key]])),
  }
}
