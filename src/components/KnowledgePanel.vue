<script setup>
import { computed, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search } from '@element-plus/icons-vue'
import { request } from '../api'

const props = defineProps({ bases: Array, connected: Boolean })
const emit = defineEmits(['changed'])
const search = ref('')
const page = ref(1)
const dialog = ref(false)
const saving = ref(false)
const formRef = ref()
const form = reactive({ name: '', description: '' })
const filtered = computed(() => props.bases.filter((base) =>
  `${base.name} ${base.description}`.toLowerCase().includes(search.value.trim().toLowerCase()),
))
const records = computed(() => filtered.value.slice((page.value - 1) * 10, page.value * 10))
const rules = {
  name: [{ required: true, whitespace: true, message: '请输入知识库名称', trigger: 'blur' }],
}

function openDialog() {
  form.name = ''
  form.description = ''
  dialog.value = true
}

async function save() {
  if (!(await formRef.value.validate().catch(() => false))) return
  saving.value = true
  try {
    await request('/knowledge-bases', { method: 'POST', body: JSON.stringify(form) })
    dialog.value = false
    page.value = 1
    search.value = ''
    ElMessage.success('知识库已创建')
    emit('changed')
  } catch (error) {
    ElMessage.error(error.message)
  } finally {
    saving.value = false
  }
}

async function remove(base) {
  try {
    await ElMessageBox.confirm(`删除“${base.name}”后，其关联数据也将删除，是否继续？`, '删除知识库', {
      type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消',
    })
    await request(`/knowledge-bases/${base.id}`, { method: 'DELETE' })
    page.value = 1
    ElMessage.success('知识库已删除')
    emit('changed')
  } catch (error) {
    if (error instanceof Error) ElMessage.error(error.message)
  }
}
</script>

<template>
  <el-card shadow="never">
    <template #header>
      <div class="card-heading">
        <strong>知识库列表</strong>
        <el-button type="primary" :icon="Plus" :disabled="!connected" @click="openDialog">新建知识库</el-button>
      </div>
    </template>
    <div class="table-toolbar">
      <el-input v-model="search" :prefix-icon="Search" placeholder="搜索名称或描述" clearable @input="page = 1" />
      <el-text type="info">共 {{ filtered.length }} 个知识库</el-text>
    </div>
    <el-table :data="records" stripe>
      <el-table-column prop="name" label="知识库名称" min-width="160" show-overflow-tooltip />
      <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip>
        <template #default="{ row }">{{ row.description || '—' }}</template>
      </el-table-column>
      <el-table-column prop="rule_count" label="规则数" width="85" />
      <el-table-column prop="fact_count" label="事实数" width="85" />
      <el-table-column label="创建时间" width="170">
        <template #default="{ row }">{{ new Date(row.created_at).toLocaleString('zh-CN', { hour12: false }) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="80" fixed="right">
        <template #default="{ row }"><el-button link type="danger" @click="remove(row)">删除</el-button></template>
      </el-table-column>
      <template #empty><el-empty :image-size="100" :description="search ? '没有找到匹配的知识库' : '暂无知识库，点击右上方新建'" /></template>
    </el-table>
    <el-pagination v-if="filtered.length" v-model:current-page="page" :page-size="10" :total="filtered.length" layout="total, prev, pager, next" class="pagination" />
  </el-card>
  <el-dialog v-model="dialog" title="新建知识库" width="min(520px, 92vw)" destroy-on-close :close-on-click-modal="!saving" :show-close="!saving" :close-on-press-escape="!saving">
    <el-form ref="formRef" :model="form" :rules="rules" label-position="top" :disabled="saving" @submit.prevent="save">
      <el-form-item label="知识库名称" prop="name">
        <el-input v-model="form.name" placeholder="输入你的实验主题名称" maxlength="40" show-word-limit />
      </el-form-item>
      <el-form-item label="描述" prop="description">
        <el-input v-model="form.description" type="textarea" :rows="4" placeholder="简要说明实验场景与目标（选填）" maxlength="300" show-word-limit />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button :disabled="saving" @click="dialog = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="save">创建</el-button>
    </template>
  </el-dialog>
</template>
