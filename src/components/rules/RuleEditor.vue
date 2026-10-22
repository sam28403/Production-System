<script setup>
import { Delete, Plus } from '@element-plus/icons-vue'
import { formatCondition, isNumericField, operatorsFor, ruleFields } from '../../../shared/rule-fields'
import { useRuleEditor } from './useRuleEditor'

const props = defineProps({ baseId: Number })
const emit = defineEmits(['saved'])
const {
  visible, saving, editingId, formRef, form, preview, validation,
  open, changeField, addCondition, save,
} = useRuleEditor(props, emit)
defineExpose({ open })
</script>

<template>
  <el-dialog
    v-model="visible"
    :title="editingId ? '编辑规则' : '新建规则'"
    width="min(820px, 94vw)"
    destroy-on-close
    :show-close="!saving"
    :close-on-click-modal="false"
    :close-on-press-escape="!saving"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="validation"
      :disabled="saving"
      label-position="top"
      @submit.prevent="save"
    >
      <el-form-item label="规则名称" prop="name">
        <el-input v-model="form.name" maxlength="80" show-word-limit placeholder="请输入规则名称" />
      </el-form-item>
      <el-form-item label="前提条件">
        <div class="rule-conditions">
          <el-radio-group v-model="form.match_mode" class="section-gap">
            <el-radio-button value="all">全部满足（AND）</el-radio-button>
            <el-radio-button value="any">任一满足（OR）</el-radio-button>
          </el-radio-group>
          <div v-for="(condition, index) in form.conditions" :key="index" class="condition-row">
            <el-select v-model="condition.field" :aria-label="`条件 ${index + 1} 字段`" @change="changeField(condition)">
              <el-option v-for="field in ruleFields" :key="field.value" :label="field.label" :value="field.value" />
            </el-select>
            <el-select v-model="condition.operator" :aria-label="`条件 ${index + 1} 运算符`">
              <el-option v-for="operator in operatorsFor(condition.field)" :key="operator.value" :label="operator.label" :value="operator.value" />
            </el-select>
            <el-input-number
              v-if="isNumericField(condition.field)"
              v-model="condition.value"
              :min="condition.field === 'car_count' ? 1 : 0"
              :max="1000"
              :precision="condition.field === 'car_count' ? 0 : undefined"
              :aria-label="`条件 ${index + 1} 数值`"
              controls-position="right"
            />
            <el-input v-else v-model="condition.value" :aria-label="`条件 ${index + 1} 内容`" maxlength="200" placeholder="输入特征值" />
            <el-button
              :icon="Delete"
              :aria-label="`删除条件 ${index + 1}`"
              :disabled="form.conditions.length === 1"
              @click="form.conditions.splice(index, 1)"
            />
          </div>
          <el-button :icon="Plus" :disabled="form.conditions.length >= 30" @click="addCondition">添加条件</el-button>
        </div>
      </el-form-item>
      <el-form-item label="推导结论" prop="conclusion">
        <el-input v-model="form.conclusion" maxlength="200" show-word-limit placeholder="输入候选车型或中间特征" />
      </el-form-item>
      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="优先级">
            <el-input-number v-model="form.priority" :min="0" :max="999" :precision="0" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="状态"><el-switch v-model="form.enabled" active-text="启用" inactive-text="停用" /></el-form-item>
        </el-col>
      </el-row>
      <el-form-item label="资料链接">
        <el-input v-model="form.source_url" maxlength="500" placeholder="请输入资料链接（选填）" />
      </el-form-item>
      <el-form-item label="说明与适用批次">
        <el-input v-model="form.notes" type="textarea" :rows="2" maxlength="1000" show-word-limit placeholder="请输入备注（选填）" />
      </el-form-item>
      <el-alert type="info" :closable="false" title="规则预览">
        IF {{ preview.map(formatCondition).join(form.match_mode === 'all' ? ' 且 ' : ' 或 ') }}
        → THEN {{ form.conclusion || '待填写结论' }}
      </el-alert>
    </el-form>
    <template #footer>
      <el-button :disabled="saving" @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="save">保存规则</el-button>
    </template>
  </el-dialog>
</template>
