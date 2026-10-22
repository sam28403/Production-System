import { ruleFields } from './rule-fields.js'
import { validateCondition } from './condition-validation.js'

const questionOrder = [
  'brand', 'appearance', 'car_count', 'purpose', 'environment', 'series',
  'service_status', 'traction', 'operating_speed', 'formation', 'design_speed', 'test_speed',
]

const titles = {
  traction: '列车采用哪种动力形式？',
  brand: '列车属于哪个品牌？',
  series: '列车属于哪个系列？',
  car_count: '列车有多少辆车厢？',
  formation: '列车的动力编组是什么？',
  operating_speed: '列车的运营速度是多少？',
  design_speed: '列车的设计速度是多少？',
  test_speed: '列车的最高实验速度是多少？',
  environment: '列车适用于哪些环境？',
  service_status: '列车处于哪种车型状态？',
  purpose: '列车的用途是什么？',
  appearance: '列车有哪些外观特征？',
}

function optionLabel(field, value) {
  if (field.endsWith('_speed')) return `${value} km/h`
  if (field === 'car_count') return `${value} 辆`
  return String(value)
}

export function buildQuestions(facts) {
  return questionOrder.map((field) => {
    const options = new Map()
    for (const fact of facts.filter((item) => item.field_key === field)) {
      if (validateCondition({ field, operator: 'eq', value: fact.value })) continue
      const key = JSON.stringify(fact.value)
      if (!options.has(key)) options.set(key, {
        id: fact.id, value: fact.value, label: optionLabel(field, fact.value),
      })
    }
    return {
      field,
      label: ruleFields.find((item) => item.value === field).label,
      title: titles[field],
      multiple: ['environment', 'appearance'].includes(field),
      options: [...options.values()].sort((a, b) => typeof a.value === 'number'
        ? a.value - b.value : a.label.localeCompare(b.label, 'zh-CN', { numeric: true })),
    }
  }).filter((question) => question.options.length)
}

// null is an explicit skip. Unanswered and skipped questions supply no facts.
export function answerFactIds(questions, answers) {
  return questions.flatMap((question) => {
    const answer = answers[question.field]
    const selected = Array.isArray(answer) ? answer : [answer]
    return question.options.filter((option) => selected.includes(option.id)).map((option) => option.id)
  })
}
