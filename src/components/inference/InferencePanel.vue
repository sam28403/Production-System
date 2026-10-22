<script setup>
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { request } from '../../api'
import { useBaseRecords } from '../../composables/useBaseRecords'
import Questionnaire from './Questionnaire.vue'
import InferenceResult from './InferenceResult.vue'
import './inference.css'

const props = defineProps({ bases: Array, connected: Boolean, revision: Number })
const emit = defineEmits(['recorded', 'navigate'])
const { baseId, rows: facts, loading, error, reload } = useBaseRecords(props, 'facts')
const running = ref(false)
const run = ref(null)
watch(baseId, () => { run.value = null })

async function start(factIds) {
  if (running.value || loading.value || !factIds.length) return
  const currentBase = baseId.value
  run.value = null
  running.value = true
  try {
    const result = await request(`/knowledge-bases/${currentBase}/runs`, {
      method: 'POST', body: JSON.stringify({ fact_ids: factIds }),
    })
    if (currentBase === baseId.value) run.value = result
    emit('recorded')
  } catch (cause) {
    ElMessage.error(cause.message)
  } finally {
    running.value = false
  }
}
</script>

<template>
  <el-card v-if="!bases.length" shadow="never">
    <el-empty description="暂无知识库">
      <el-button type="primary" @click="$emit('navigate', 'knowledge')">创建知识库</el-button>
    </el-empty>
  </el-card>
  <template v-else>
    <el-card v-loading="loading" shadow="never" class="section-gap">
      <template #header>
        <div class="card-heading">
          <strong>列车识别问答</strong>
        </div>
      </template>
      <el-select v-model="baseId" class="inference-base" :disabled="running" aria-label="选择知识库">
        <el-option v-for="base in bases" :key="base.id" :label="base.name" :value="base.id" />
      </el-select>
      <el-alert v-if="error" :title="error" type="error" show-icon :closable="false">
        <el-button link @click="reload">重新加载</el-button>
      </el-alert>
      <Questionnaire
        v-else-if="!loading"
        :key="baseId"
        :facts="facts"
        :disabled="running || !connected"
        :running="running"
        @changed="run = null"
        @submit="start"
      />
    </el-card>
    <InferenceResult v-if="run" :run="run" />
  </template>
</template>
