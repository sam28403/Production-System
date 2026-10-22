<script setup>
import { computed, ref, watch } from 'vue'
import { answerFactIds, buildQuestions } from '../../../shared/inference-questions'
import './questionnaire.css'

const props = defineProps({ facts: Array, disabled: Boolean, running: Boolean })
const emit = defineEmits(['submit', 'changed'])
const questions = computed(() => buildQuestions(props.facts))
const answers = ref({})
const step = ref(0)
const current = computed(() => questions.value[step.value])
const reviewing = computed(() => step.value >= questions.value.length)
const selectedIds = computed(() => answerFactIds(questions.value, answers.value))
const answer = computed({
  get: () => answers.value[current.value?.field] ?? (current.value?.multiple ? [] : undefined),
  set: (value) => {
    answers.value = { ...answers.value, [current.value.field]: value }
    emit('changed')
  },
})
const canContinue = computed(() => Array.isArray(answer.value)
  ? answer.value.length > 0 : answer.value !== undefined)
const summary = computed(() => questions.value.map((question, index) => {
  const ids = answerFactIds([question], answers.value)
  return {
    index, label: question.label,
    value: ids.length ? question.options.filter((option) => ids.includes(option.id))
      .map((option) => option.label).join('、') : '我不知道',
  }
}))

function reset() {
  answers.value = {}
  step.value = 0
  emit('changed')
}
function skip() {
  answers.value = { ...answers.value, [current.value.field]: null }
  step.value++
  emit('changed')
}
watch(() => props.facts, reset)
</script>

<template>
  <el-empty v-if="!questions.length" description="暂无可用问题" :image-size="90" />
  <div v-else class="questionnaire">
    <template v-if="!reviewing">
      <div class="question-progress">
        <el-text type="info">问题 {{ step + 1 }} / {{ questions.length }}</el-text>
        <el-button link :disabled="disabled" @click="reset">重新开始</el-button>
      </div>
      <el-progress :percentage="Math.round(step / questions.length * 100)" :show-text="false" />
      <h2 :id="`question-${current.field}`" class="question-title">{{ current.title }}</h2>
      <el-checkbox-group
        v-if="current.multiple"
        :key="current.field"
        v-model="answer"
        :disabled="disabled"
        :aria-labelledby="`question-${current.field}`"
        class="question-options"
      >
        <el-checkbox v-for="option in current.options" :key="option.id" :value="option.id" border>
          {{ option.label }}
        </el-checkbox>
      </el-checkbox-group>
      <el-radio-group
        v-else
        :key="current.field"
        v-model="answer"
        :disabled="disabled"
        :aria-labelledby="`question-${current.field}`"
        class="question-options"
      >
        <el-radio v-for="option in current.options" :key="option.id" :value="option.id" border>
          {{ option.label }}
        </el-radio>
      </el-radio-group>
      <el-button class="unknown-answer" :disabled="disabled" @click="skip">我不知道</el-button>
      <div class="question-actions">
        <el-button :disabled="disabled || step === 0" @click="step--">上一题</el-button>
        <el-button type="primary" :disabled="disabled || !canContinue" @click="step++">
          {{ step === questions.length - 1 ? '完成问答' : '下一题' }}
        </el-button>
      </div>
    </template>
    <template v-else>
      <div class="question-progress">
        <strong>回答确认</strong>
        <el-button link :disabled="disabled" @click="reset">重新开始</el-button>
      </div>
      <el-table :data="summary">
        <el-table-column prop="label" label="问题" min-width="160" />
        <el-table-column prop="value" label="回答" min-width="180" />
        <el-table-column label="操作" width="80">
          <template #default="{ row }">
            <el-button link type="primary" :disabled="disabled" @click="step = row.index">修改</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-alert
        v-if="!selectedIds.length"
        class="inference-notice"
        title="所有问题均已跳过，暂无识别结果。"
        type="info"
        :closable="false"
        show-icon
      />
      <div class="question-actions">
        <el-button :disabled="disabled" @click="step--">上一题</el-button>
        <el-button
          type="primary"
          :loading="running"
          :disabled="disabled || !selectedIds.length"
          @click="emit('submit', selectedIds)"
        >查看识别结果</el-button>
      </div>
    </template>
  </div>
</template>
