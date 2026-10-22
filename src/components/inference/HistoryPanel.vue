<script setup>
import { computed, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { request } from '../../api'
import { useBaseRecords } from '../../composables/useBaseRecords'
import InferenceResult from './InferenceResult.vue'
import './inference.css'

const props = defineProps({ bases: Array, connected: Boolean, revision: Number })
const emit = defineEmits(['changed', 'navigate'])
const { baseId, rows, loading, error, reload } = useBaseRecords(props, 'runs')
const current = ref(null)
const visible = ref(false)
const opening = ref(false)
const deleting = ref(null)
const page = ref(1)
const records = computed(() => rows.value.slice((page.value - 1) * 10, page.value * 10))
watch(baseId, () => { current.value = null; visible.value = false; page.value = 1 })
watch(rows, () => { if (!loading.value) page.value = 1 })

async function open(row) {
  opening.value = true
  const selectedBase = baseId.value
  try {
    const data = await request(`/knowledge-bases/${selectedBase}/runs/${row.id}`)
    if (selectedBase === baseId.value) { current.value = data; visible.value = true }
  } catch (cause) {
    ElMessage.error(cause.message)
  } finally {
    opening.value = false
  }
}
async function remove(row) {
  const selectedBase = baseId.value
  try {
    await ElMessageBox.confirm(`确定删除实验记录 #${row.id}？`, '删除实验记录', {
      confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning',
    })
    deleting.value = row.id
    await request(`/knowledge-bases/${selectedBase}/runs/${row.id}`, { method: 'DELETE' })
    emit('changed')
    page.value = 1
    ElMessage.success('实验记录已删除')
  } catch (cause) {
    if (cause instanceof Error) ElMessage.error(cause.message)
  } finally {
    deleting.value = null
  }
}
</script>

<template>
  <el-card v-if="!bases.length" shadow="never">
    <el-empty description="暂无知识库"><el-button type="primary" @click="$emit('navigate', 'knowledge')">创建知识库</el-button></el-empty>
  </el-card>
  <el-card v-else v-loading="loading" shadow="never">
    <template #header><strong>实验记录</strong></template>
    <el-select v-model="baseId" class="inference-base" aria-label="选择知识库">
      <el-option v-for="base in bases" :key="base.id" :label="base.name" :value="base.id" />
    </el-select>
    <el-alert v-if="error" type="error" :title="error" :closable="false"><el-button link @click="reload">重新加载</el-button></el-alert>
    <el-table v-else :data="records" stripe>
      <el-table-column prop="id" label="实验编号" width="100" />
      <el-table-column label="运行时间" min-width="180">
        <template #default="{ row }">{{ new Date(row.created_at).toLocaleString('zh-CN', { hour12: false }) }}</template>
      </el-table-column>
      <el-table-column prop="fact_count" label="事实数" width="90" />
      <el-table-column prop="step_count" label="推理步数" width="100" />
      <el-table-column prop="candidate_count" label="候选数" width="90" />
      <el-table-column label="操作" width="140" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" :disabled="opening || !connected" @click="open(row)">查看</el-button>
          <el-button link type="danger" :disabled="deleting !== null || !connected" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
      <template #empty><el-empty :image-size="80" description="暂无实验记录" /></template>
    </el-table>
    <el-pagination v-if="rows.length" v-model:current-page="page" :page-size="10" :total="rows.length" layout="total, prev, pager, next" class="pagination" />
  </el-card>
  <el-dialog v-model="visible" title="实验详情" width="min(1100px, 96vw)" top="5vh" destroy-on-close>
    <InferenceResult v-if="current" :run="current" />
  </el-dialog>
</template>
