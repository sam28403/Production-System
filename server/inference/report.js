import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ruleFields, formatCondition } from '../../shared/rule-fields.js'

const directory = fileURLToPath(new URL('../../data/reports/', import.meta.url))
const label = (field) => ruleFields.find((item) => item.value === field)?.label || field

export function buildReport(run, format) {
  if (format === 'json') return JSON.stringify(run, null, 2) + '\n'
  const lines = [
    `# 列车识别实验 ${run.id}`, '', `时间：${run.created_at}`, '',
    '## 初始事实', '',
    ...run.initial_facts.map((fact) => `- ${label(fact.field_key)}：${fact.value}`),
    '', '## 推理过程', '',
  ]
  for (const step of run.result.explanation?.steps || []) {
    lines.push(`- ${label(step.field)}：${step.value}；核对 ${step.before} 个车型，`
      + `排除 ${step.excluded.length} 个，保留 ${step.remaining} 个。`)
    if (step.excluded.length) lines.push(`  - 排除：${step.excluded.join('、')}`)
    if (step.unknown.length) lines.push(`  - 该特征资料不足：${step.unknown.join('、')}`)
  }
  lines.push('', '## 规则触发记录', '')
  if (!run.trace.length) lines.push('没有满足完整前提的规则。')
  for (const event of run.trace) {
    lines.push(`${event.step}. R${event.rule_id} ${event.name}`, '',
      `   ${event.conditions.map(formatCondition).join('；')} → ${event.conclusion}`, '')
  }
  lines.push('', '## 候选车型', '')
  for (const candidate of run.result.candidates || []) {
    lines.push(`- ${candidate.model}：已核实 ${candidate.matched}/${candidate.total} 个输入条件；`
      + `${candidate.status === 'supported' ? '已知条件符合' : '仍有条件待核验'}。`)
    for (const item of candidate.evidence) {
      lines.push(`  - ${label(item.field)}：${item.value}（${item.status === 'matched' ? '已核实' : '资料不足'}）`)
    }
    lines.push(`  - 来源：${candidate.source_url}`)
  }
  if (!(run.result.candidates || []).length) lines.push('未找到与已知条件兼容的候选车型。')
  if (run.result.unsupported_fields?.length) {
    lines.push('', `缺少资料的输入字段：${run.result.unsupported_fields.map(label).join('、')}。`)
  }
  lines.push('', '候选匹配表示已知条件与资料相容，不等于唯一型号认定。未核验的条件不会被视为已满足。',
    'JSON 报告包含本次使用的事实与规则快照，便于复查。', '')
  return lines.join('\n')
}

export function writeReport(run, format, root = directory) {
  const content = buildReport(run, format)
  const folder = join(root, `knowledge-base-${run.knowledge_base_id}`)
  mkdirSync(folder, { recursive: true })
  writeFileSync(join(folder, `run-${run.id}.${format}`), content, 'utf8')
  return content
}
