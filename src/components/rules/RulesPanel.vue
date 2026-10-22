<script setup>
import { computed, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search } from '@element-plus/icons-vue'
import { request } from '../../api'
import { formatCondition } from '../../../shared/rule-fields'
import RuleEditor from './RuleEditor.vue'
import './rules.css'

const props = defineProps({ bases: Array, connected: Boolean, revision: Number })
const emit = defineEmits(['changed'])
const baseId = ref(null)
const rows = ref([])
const loading = ref(false)
const creating = ref(false)
const error = ref('')
const search = ref('')
const state = ref('all')
const page = ref(1)
const editor = ref()
const deleting = ref(null)
let generation = 0
const filtered = computed(() => rows.value.filter((row) => {
  const text = [row.name, row.conclusion, ...row.conditions.map(formatCondition)].join(' ')
  return text.toLowerCase().includes(search.value.trim().toLowerCase())
    && (state.value === 'all' || row.enabled === (state.value === 'enabled'))
}))
const records = computed(() => filtered.value.slice((page.value - 1) * 10, page.value * 10))

watch(() => props.bases, (bases) => {
  if (!bases.some((base) => base.id === baseId.value)) baseId.value = bases[0]?.id || null
}, { immediate: true })
watch([search, state], () => { page.value = 1 })
watch([baseId, () => props.revision], load, { immediate: true })

async function load() {
  const current = ++generation
  rows.value = []
  page.value = 1
  error.value = ''
  if (!baseId.value) {
    loading.value = false
    return
  }
  loading.value = true
  try {
    const data = await request(`/knowledge-bases/${baseId.value}/rules`)
    if (generation === current) rows.value = data
  } catch (cause) {
    if (generation === current) error.value = cause.message
  } finally {
    if (generation === current) loading.value = false
  }
}

async function createBase() {
  creating.value = true
  try {
    const base = await request('/knowledge-bases', {
      method: 'POST',
      body: JSON.stringify({ name: '中国铁路列车识别', description: 'CR、CRH 系列车型识别规则' }),
    })
    baseId.value = base.id
    emit('changed')
    ElMessage.success('铁路知识库已创建，可以开始录入规则')
  } catch (cause) {
    ElMessage.error(cause.message)
  } finally {
    creating.value = false
  }
}

async function remove(row) {
  const selectedBase = baseId.value
  try {
    await ElMessageBox.confirm(`确定删除规则“${row.name}”？`, '删除规则', {
      type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消',
    })
    deleting.value = row.id
    await request(`/knowledge-bases/${selectedBase}/rules/${row.id}`, { method: 'DELETE' })
    ElMessage.success('规则已删除')
    emit('changed')
  } catch (cause) {
    if (cause instanceof Error) ElMessage.error(cause.message)
  } finally {
    deleting.value = null
  }
}
</script>

<template>
  <el-card v-if="!bases.length" shadow="never">
    <el-empty description="暂无知识库">
      <el-button type="primary" :loading="creating" :disabled="!connected" @click="createBase">创建铁路知识库</el-button>
    </el-empty>
  </el-card>
  <template v-else>
    <el-card v-loading="loading" shadow="never">
      <template #header>
        <div class="card-heading">
          <strong>识别规则</strong>
          <el-button type="primary" :icon="Plus" :disabled="!connected || !baseId || !!error" @click="editor.open()">新建规则</el-button>
        </div>
      </template>
      <div class="rule-toolbar">
        <el-select v-model="baseId" aria-label="选择知识库" placeholder="选择知识库">
          <el-option v-for="base in bases" :key="base.id" :label="base.name" :value="base.id" />
        </el-select>
        <el-input v-model="search" :prefix-icon="Search" placeholder="搜索规则、条件或结论" clearable />
        <el-select v-model="state" aria-label="筛选规则状态">
          <el-option label="全部状态" value="all" />
          <el-option label="已启用" value="enabled" />
          <el-option label="已停用" value="disabled" />
        </el-select>
      </div>
      <el-alert v-if="error" type="error" :title="error" :closable="false" show-icon>
        <el-button link type="primary" @click="load">重新加载</el-button>
      </el-alert>
      <el-table v-else :data="records" stripe row-key="id">
        <el-table-column type="expand">
          <template #default="{ row }">
            <el-descriptions :column="1" border class="rule-details">
              <el-descriptions-item label="规则编号">R{{ row.id }}</el-descriptions-item>
              <el-descriptions-item label="资料链接">
                <el-link v-if="row.source_url" :href="row.source_url" target="_blank" rel="noopener noreferrer" type="primary">{{ row.source_url }}</el-link>
                <span v-else>未填写</span>
              </el-descriptions-item>
              <el-descriptions-item label="说明与适用批次">{{ row.notes || '未填写' }}</el-descriptions-item>
            </el-descriptions>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="规则名称" min-width="170" show-overflow-tooltip />
        <el-table-column label="前提条件" min-width="280">
          <template #default="{ row }">
            <el-tag size="small" type="info">{{ row.match_mode === 'all' ? '全部满足' : '任一满足' }}</el-tag>
            <div v-for="(condition, index) in row.conditions" :key="index" class="condition-summary">{{ formatCondition(condition) }}</div>
          </template>
        </el-table-column>
        <el-table-column prop="conclusion" label="推导结论" min-width="160" show-overflow-tooltip />
        <el-table-column prop="priority" label="优先级" width="85" />
        <el-table-column label="状态" width="85">
          <template #default="{ row }"><el-tag :type="row.enabled ? 'success' : 'info'" size="small">{{ row.enabled ? '启用' : '停用' }}</el-tag></template>
        </el-table-column>
        <el-table-column label="操作" width="125" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" :disabled="!connected" @click="editor.open(row)">编辑</el-button>
            <el-button link type="danger" :disabled="!connected || deleting !== null" :loading="deleting === row.id" @click="remove(row)">删除</el-button>
          </template>
        </el-table-column>
        <template #empty><el-empty :image-size="80" :description="rows.length ? '没有找到匹配的规则' : '暂无规则'" /></template>
      </el-table>
      <el-pagination v-if="filtered.length" v-model:current-page="page" :page-size="10" :total="filtered.length" layout="total, prev, pager, next" class="pagination" />
    </el-card>
    <RuleEditor :key="baseId" ref="editor" :base-id="baseId" @saved="$emit('changed')" />
  </template>
</template>
