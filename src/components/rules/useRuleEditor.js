import { computed, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { request } from '../../api'
import { isNumericField } from '../../../shared/rule-fields'

export function useRuleEditor(props, emit) {
  const visible = ref(false)
  const saving = ref(false)
  const editingId = ref(null)
  const formRef = ref()
  const form = reactive({})
  const preview = computed(() => form.conditions || [])
  const required = (message) => [{ required: true, whitespace: true, message, trigger: 'blur' }]
  const validation = {
    name: required('请输入规则名称'),
    conclusion: required('请输入车型或中间特征结论'),
  }

  function open(row) {
    editingId.value = row?.id || null
    Object.assign(form, {
      name: row?.name || '',
      conclusion: row?.conclusion || '',
      conditions: row ? JSON.parse(JSON.stringify(row.conditions))
        : [{ field: 'design_speed', operator: 'eq', value: 350 }],
      match_mode: row?.match_mode || 'all',
      priority: row?.priority ?? 0,
      enabled: row?.enabled ?? true,
      source_url: row?.source_url || '',
      notes: row?.notes || '',
    })
    visible.value = true
  }

  function changeField(condition) {
    condition.operator = 'eq'
    condition.value = isNumericField(condition.field) ? 0 : ''
    if (condition.field === 'car_count') condition.value = 8
  }

  function addCondition() {
    form.conditions.push({ field: 'appearance', operator: 'contains', value: '' })
  }

  async function save() {
    if (saving.value || !(await formRef.value.validate().catch(() => false))) return
    saving.value = true
    try {
      const path = `/knowledge-bases/${props.baseId}/rules`
      await request(editingId.value ? `${path}/${editingId.value}` : path, {
        method: editingId.value ? 'PUT' : 'POST',
        body: JSON.stringify(form),
      })
      visible.value = false
      ElMessage.success(editingId.value ? '规则已更新' : '规则已创建')
      emit('saved')
    } catch (error) {
      ElMessage.error(error.message)
    } finally {
      saving.value = false
    }
  }

  return {
    visible, saving, editingId, formRef, form, preview, validation,
    open, changeField, addCondition, save,
  }
}
