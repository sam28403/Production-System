import { validateCondition } from '../../shared/condition-validation.js'
import { ruleFields } from '../../shared/rule-fields.js'

export function validateFact(body) {
  if (!body || typeof body !== 'object') return '请求内容不能为空。'
  if (typeof body.name !== 'string' || body.name.trim().length > 80) {
    return '事实名称不能超过 80 字。'
  }
  const error = validateCondition({ field: body.field_key, operator: 'eq', value: body.value })
  if (error) return error
  if (typeof body.notes !== 'string' || body.notes.length > 1000) return '备注不能超过 1000 字。'
  if (typeof body.source_url !== 'string' || body.source_url.length > 500) {
    return '资料链接不能超过 500 字。'
  }
  if (body.source_url.trim()) {
    try {
      const url = new URL(body.source_url.trim())
      if (!['http:', 'https:'].includes(url.protocol)) return '资料链接需使用 HTTP 或 HTTPS。'
    } catch {
      return '请输入完整的资料链接。'
    }
  }
  return null
}

export function factParameters(body) {
  const value = typeof body.value === 'string' ? body.value.trim() : body.value
  const label = ruleFields.find((field) => field.value === body.field_key).label
  const name = body.name.trim() || `${label} ${value}`.slice(0, 80)
  return [name, body.field_key, JSON.stringify(value), body.source_url.trim(), body.notes.trim()]
}
