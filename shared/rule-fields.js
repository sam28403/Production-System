export const ruleFields = [
  { value: 'series', label: '系列', type: 'text' },
  { value: 'brand', label: '品牌', type: 'text' },
  { value: 'service_status', label: '车型状态', type: 'text' },
  { value: 'design_speed', label: '设计速度（km/h）', type: 'number' },
  { value: 'operating_speed', label: '运营速度（km/h）', type: 'number' },
  { value: 'test_speed', label: '最高实验速度（km/h）', type: 'number' },
  { value: 'car_count', label: '车辆数量', type: 'number' },
  { value: 'formation', label: '动力编组', type: 'text' },
  { value: 'traction', label: '动力形式', type: 'text' },
  { value: 'purpose', label: '用途', type: 'text' },
  { value: 'appearance', label: '外观特征', type: 'text' },
  { value: 'environment', label: '适用环境', type: 'text' },
  { value: 'derived_feature', label: '已推导特征', type: 'text' },
]

export const ruleOperators = [
  { value: 'eq', label: '等于' },
  { value: 'ne', label: '不等于' },
  { value: 'contains', label: '包含' },
  { value: 'gt', label: '大于' },
  { value: 'gte', label: '大于等于' },
  { value: 'lt', label: '小于' },
  { value: 'lte', label: '小于等于' },
]

export function isNumericField(field) {
  return ruleFields.find((item) => item.value === field)?.type === 'number'
}

export function operatorsFor(field) {
  return ruleOperators.filter((item) => isNumericField(field)
    ? item.value !== 'contains'
    : ['eq', 'ne', 'contains'].includes(item.value))
}

export function formatCondition(condition) {
  const field = ruleFields.find((item) => item.value === condition.field)?.label || condition.field
  const operator = ruleOperators.find((item) => item.value === condition.operator)?.label || condition.operator
  return `${field} ${operator} ${condition.value}`
}
