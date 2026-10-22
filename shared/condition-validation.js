import { isNumericField, operatorsFor, ruleFields } from './rule-fields.js'

export function validateCondition(condition) {
  if (!condition || !ruleFields.some((field) => field.value === condition.field)) {
    return '请选择有效的特征字段。'
  }
  if (!operatorsFor(condition.field).some((operator) => operator.value === condition.operator)) {
    return '条件运算符不适用于当前字段。'
  }
  if (isNumericField(condition.field)) {
    if (typeof condition.value !== 'number' || !Number.isFinite(condition.value)
      || condition.value < 0 || condition.value > 1000) {
      return '请输入 0–1000 之间的数值。'
    }
    if (condition.field === 'car_count'
      && (!Number.isInteger(condition.value) || condition.value < 1)) {
      return '车辆数量必须是 1–1000 的整数。'
    }
  } else if (typeof condition.value !== 'string'
    || !condition.value.trim() || condition.value.trim().length > 200) {
    return '文本内容需为 1–200 字。'
  }
  return null
}
