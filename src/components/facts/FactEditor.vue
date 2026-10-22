<script setup>
import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { request } from '../../api'
import { isNumericField, ruleFields } from '../../../shared/rule-fields'
import { validateCondition } from '../../../shared/condition-validation'

const props = defineProps({ baseId: Number })
const emit = defineEmits(['saved'])
const visible = ref(false)
const saving = ref(false)
const editingId = ref(null)
const formRef = ref()
const form = reactive({ name: '', field_key: '', value: '', source_url: '', notes: '' })
const rules = {
  field_key: [{ required: true, message: '请选择特征字段', trigger: 'change' }],
  value: [{
    validator: (rule, value, callback) => {
      const error = validateCondition({ field: form.field_key, operator: 'eq', value })
      callback(error ? new Error(error) : undefined)
    },
    trigger: 'blur',
  }],
}

function open(fact) {
  editingId.value = fact?.id || null
  Object.assign(form, {
    name: fact?.name || '',
    field_key: fact?.field_key || '',
    value: fact?.value ?? '',
    source_url: fact?.source_url || '',
    notes: fact?.notes || '',
  })
  visible.value = true
}

function changeField() {
  form.value = isNumericField(form.field_key) ? undefined : ''
  formRef.value?.clearValidate('value')
}

async function save() {
  if (saving.value || !(await formRef.value.validate().catch(() => false))) return
  saving.value = true
  try {
    const path = `/knowledge-bases/${props.baseId}/facts`
    await request(editingId.value ? `${path}/${editingId.value}` : path, {
      method: editingId.value ? 'PUT' : 'POST', body: JSON.stringify(form),
    })
    visible.value = false
    ElMessage.success(editingId.value ? '事实已更新' : '事实已创建')
    emit('saved')
  } catch (error) {
    ElMessage.error(error.message)
  } finally {
    saving.value = false
  }
}
defineExpose({ open })
</script>

<template>
  <el-dialog
    v-model="visible"
    :title="editingId ? '编辑事实' : '新建事实'"
    width="min(560px, 94vw)"
    destroy-on-close
    :show-close="!saving"
    :close-on-click-modal="false"
    :close-on-press-escape="!saving"
  >
    <el-form ref="formRef" :model="form" :rules="rules" :disabled="saving" label-position="top" @submit.prevent="save">
      <el-form-item label="特征字段" prop="field_key">
        <el-select v-model="form.field_key" placeholder="请选择特征字段" @change="changeField">
          <el-option v-for="field in ruleFields" :key="field.value" :label="field.label" :value="field.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="特征值" prop="value">
        <el-input-number
          v-if="isNumericField(form.field_key)"
          v-model="form.value"
          :min="form.field_key === 'car_count' ? 1 : 0"
          :max="1000"
          :precision="form.field_key === 'car_count' ? 0 : undefined"
          controls-position="right"
          aria-label="特征值"
          class="fact-number-input"
        />
        <el-input v-else v-model="form.value" placeholder="请输入特征值" maxlength="200" show-word-limit />
      </el-form-item>
      <el-form-item label="事实名称">
        <el-input v-model="form.name" placeholder="自动生成（选填）" maxlength="80" show-word-limit />
      </el-form-item>
      <el-form-item label="资料链接">
        <el-input v-model="form.source_url" placeholder="请输入资料链接（选填）" maxlength="500" />
      </el-form-item>
      <el-form-item label="备注">
        <el-input v-model="form.notes" type="textarea" :rows="3" placeholder="请输入备注（选填）" maxlength="1000" show-word-limit />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button :disabled="saving" @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="save">保存事实</el-button>
    </template>
  </el-dialog>
</template>
