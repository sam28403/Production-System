import { validateCondition } from '../../shared/condition-validation.js'

export function validateRule(body) {
  if (!body || typeof body !== 'object') return '请求内容不能为空。'
  if (typeof body.name !== 'string' || !body.name.trim() || body.name.trim().length > 80) {
    return '规则名称需为 1–80 字。'
  }
  if (typeof body.conclusion !== 'string' || !body.conclusion.trim()
    || body.conclusion.trim().length > 200) return '推导结论需为 1–200 字。'
  if (!['all', 'any'].includes(body.match_mode)) return '请选择有效的条件关系。'
  if (!Number.isInteger(body.priority) || body.priority < 0 || body.priority > 999) {
    return '优先级必须是 0–999 的整数。'
  }
  if (typeof body.enabled !== 'boolean') return '启用状态必须为布尔值。'
  if (typeof body.notes !== 'string' || body.notes.length > 1000) return '说明不能超过 1000 字。'
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
  if (!Array.isArray(body.conditions) || !body.conditions.length || body.conditions.length > 30) {
    return '每条规则需要 1–30 个前提条件。'
  }
  for (const condition of body.conditions) {
    const error = validateCondition(condition)
    if (error) return error
  }
  return null
}

export function ruleParameters(body) {
  const conditions = body.conditions.map(({ field, operator, value }) => ({
    field, operator, value: typeof value === 'string' ? value.trim() : value,
  }))
  return [
    body.name.trim(), JSON.stringify(conditions), body.conclusion.trim(),
    body.priority, Number(body.enabled), body.match_mode,
    body.source_url.trim(), body.notes.trim(),
  ]
}
