<script setup>
import { computed, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search } from '@element-plus/icons-vue'
import { request } from '../../api'
import { ruleFields } from '../../../shared/rule-fields'
import FactEditor from './FactEditor.vue'
import './facts.css'

const props = defineProps({ bases: Array, connected: Boolean, revision: Number })
const emit = defineEmits(['changed', 'navigate'])
const baseId = ref(null)
const rows = ref([])
const search = ref('')
const field = ref('all')
const page = ref(1)
const loading = ref(false)
const error = ref('')
const deleting = ref(null)
const editor = ref()
let generation = 0
const fieldLabel = (key) => ruleFields.find((item) => item.value === key)?.label || '待补充'
const displayValue = (value) => value === null ? '—' : String(value)
const filtered = computed(() => rows.value.filter((fact) => {
  const text = [fact.name, fieldLabel(fact.field_key), displayValue(fact.value)].join(' ')
  return text.toLowerCase().includes(search.value.trim().toLowerCase())
    && (field.value === 'all' || fact.field_key === field.value)
}))
const records = computed(() => filtered.value.slice((page.value - 1) * 10, page.value * 10))

watch(() => props.bases, (bases) => {
  if (!bases.some((base) => base.id === baseId.value)) baseId.value = bases[0]?.id || null
}, { immediate: true })
watch([search, field], () => { page.value = 1 })
watch([baseId, () => props.revision], load, { immediate: true })

async function load() {
  const current = ++generation
  rows.value = []
  error.value = ''
  page.value = 1
  loading.value = Boolean(baseId.value)
  if (!baseId.value) return
  try {
    const data = await request(`/knowledge-bases/${baseId.value}/facts`)
    if (generation === current) rows.value = data
  } catch (cause) {
    if (generation === current) error.value = cause.message
  } finally {
    if (generation === current) loading.value = false
  }
}

async function remove(fact) {
  const selectedBase = baseId.value
  try {
    await ElMessageBox.confirm(`确定删除事实“${fact.name}”？`, '删除事实', {
      type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消',
    })
    deleting.value = fact.id
    await request(`/knowledge-bases/${selectedBase}/facts/${fact.id}`, { method: 'DELETE' })
    ElMessage.success('事实已删除')
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
      <el-button type="primary" @click="$emit('navigate', 'knowledge')">创建知识库</el-button>
    </el-empty>
  </el-card>
  <template v-else>
    <el-card v-loading="loading" shadow="never">
      <template #header>
        <div class="card-heading">
          <strong>事实列表</strong>
          <el-button type="primary" :icon="Plus" :disabled="!connected || !baseId || !!error" @click="editor.open()">新建事实</el-button>
        </div>
      </template>
      <div class="fact-toolbar">
        <el-select v-model="baseId" aria-label="选择知识库">
          <el-option v-for="base in bases" :key="base.id" :label="base.name" :value="base.id" />
        </el-select>
        <el-input v-model="search" :prefix-icon="Search" placeholder="搜索名称、字段或特征值" clearable />
        <el-select v-model="field" aria-label="筛选特征字段">
          <el-option label="全部字段" value="all" />
          <el-option v-for="item in ruleFields" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </div>
      <el-alert v-if="error" type="error" :title="error" :closable="false" show-icon>
        <el-button link type="primary" @click="load">重新加载</el-button>
      </el-alert>
      <el-table v-else :data="records" stripe row-key="id">
        <el-table-column type="expand">
          <template #default="{ row }">
            <el-descriptions :column="1" border class="fact-details">
              <el-descriptions-item label="事实编号">F{{ row.id }}</el-descriptions-item>
              <el-descriptions-item label="资料链接">
                <el-link v-if="row.source_url" :href="row.source_url" target="_blank" rel="noopener noreferrer" type="primary">{{ row.source_url }}</el-link>
                <span v-else>未填写</span>
              </el-descriptions-item>
              <el-descriptions-item label="备注">{{ row.notes || '未填写' }}</el-descriptions-item>
            </el-descriptions>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="事实名称" min-width="180" show-overflow-tooltip />
        <el-table-column label="特征字段" min-width="180">
          <template #default="{ row }">{{ fieldLabel(row.field_key) }}</template>
        </el-table-column>
        <el-table-column label="特征值" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">{{ displayValue(row.value) }}</template>
        </el-table-column>
        <el-table-column label="更新时间" width="175">
          <template #default="{ row }">{{ row.updated_at ? new Date(row.updated_at).toLocaleString('zh-CN', { hour12: false }) : '—' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="125" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" :disabled="!connected" @click="editor.open(row)">编辑</el-button>
            <el-button link type="danger" :disabled="!connected || deleting !== null" :loading="deleting === row.id" @click="remove(row)">删除</el-button>
          </template>
        </el-table-column>
        <template #empty><el-empty :image-size="80" :description="rows.length ? '没有找到匹配的事实' : '暂无事实'" /></template>
      </el-table>
      <el-pagination v-if="filtered.length" v-model:current-page="page" :page-size="10" :total="filtered.length" layout="total, prev, pager, next" class="pagination" />
    </el-card>
    <FactEditor :key="baseId" ref="editor" :base-id="baseId" @saved="$emit('changed')" />
  </template>
</template>
