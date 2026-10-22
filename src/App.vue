<script setup>
import { computed, defineAsyncComponent, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Collection, DataAnalysis, Document, Files, Histogram,
  House, Refresh, SetUp, Share,
} from '@element-plus/icons-vue'
import { request } from './api'
import OverviewPanel from './components/OverviewPanel.vue'
import KnowledgePanel from './components/KnowledgePanel.vue'
import RulesPanel from './components/rules/RulesPanel.vue'
import FactsPanel from './components/facts/FactsPanel.vue'
import InferencePanel from './components/inference/InferencePanel.vue'
import HistoryPanel from './components/inference/HistoryPanel.vue'
const KnowledgeGraphPanel = defineAsyncComponent(() => import('./components/graph/KnowledgeGraphPanel.vue'))

const navigation = [
  { key: 'overview', label: '实验概览', icon: House },
  { key: 'knowledge', label: '知识库管理', icon: Collection },
  { key: 'rules', label: '规则管理', icon: Document },
  { key: 'facts', label: '事实管理', icon: Files },
  { key: 'inference', label: '推理工作台', icon: SetUp },
  { key: 'history', label: '实验记录', icon: Histogram },
  { key: 'graph', label: '知识图谱', icon: Share },
]
const active = ref('overview')
const current = computed(() => navigation.find((item) => item.key === active.value))
const loading = ref(false)
const connected = ref(false)
const error = ref('')
const bases = ref([])
const revision = ref(0)
const stats = ref({ knowledgeBases: 0, rules: 0, facts: 0, runs: 0 })

async function refresh() {
  loading.value = true
  error.value = ''
  try {
    const [health, overview, records] = await Promise.all([
      request('/health'), request('/overview'), request('/knowledge-bases'),
    ])
    connected.value = health.database === 'connected'
    stats.value = overview
    bases.value = records
    revision.value++
  } catch {
    connected.value = false
    error.value = '暂时无法连接后端服务，请检查服务后重试。'
    ElMessage.error(error.value)
  } finally {
    loading.value = false
  }
}
onMounted(refresh)
</script>

<template>
  <el-container class="app-shell">
    <el-aside width="224px" class="sidebar">
      <div class="brand">
        <el-icon :size="27" color="var(--el-color-primary)"><DataAnalysis /></el-icon>
        <div><strong>产生式系统</strong><span>实验平台</span></div>
      </div>
      <div class="nav-caption">实验空间</div>
      <el-menu :default-active="active" @select="active = $event">
        <el-menu-item v-for="item in navigation" :key="item.key" :index="item.key">
          <el-icon><component :is="item.icon" /></el-icon>
          <span>{{ item.label }}</span>
        </el-menu-item>
      </el-menu>
    </el-aside>
    <el-container class="workspace">
      <el-header class="topbar">
        <el-breadcrumb separator="/">
          <el-breadcrumb-item>实验平台</el-breadcrumb-item>
          <el-breadcrumb-item>{{ current.label }}</el-breadcrumb-item>
        </el-breadcrumb>
        <el-space :size="16">
          <el-tag :type="connected ? 'success' : 'danger'" effect="plain">
            {{ connected ? '服务已连接' : '服务未连接' }}
          </el-tag>
          <el-avatar :size="32">实</el-avatar>
        </el-space>
      </el-header>
      <el-main v-loading="loading" class="main-content">
        <div class="page-heading">
          <div>
            <h1>{{ current.label }}</h1>
          </div>
          <el-button :icon="Refresh" :loading="loading" @click="refresh">刷新数据</el-button>
        </div>
        <el-alert v-if="error" :title="error" type="error" show-icon :closable="false" class="section-gap" />
        <OverviewPanel
          v-if="active === 'overview'"
          :stats="stats"
          :bases="bases"
          :connected="connected"
          @navigate="active = $event"
        />
        <KnowledgePanel
          v-else-if="active === 'knowledge'"
          :bases="bases"
          :connected="connected"
          @changed="refresh"
        />
        <RulesPanel
          v-else-if="active === 'rules'"
          :bases="bases"
          :connected="connected"
          :revision="revision"
          @changed="refresh"
        />
        <FactsPanel
          v-else-if="active === 'facts'"
          :bases="bases"
          :connected="connected"
          :revision="revision"
          @changed="refresh"
          @navigate="active = $event"
        />
        <InferencePanel
          v-else-if="active === 'inference'"
          :bases="bases"
          :connected="connected"
          :revision="revision"
          @recorded="stats.runs++"
          @navigate="active = $event"
        />
        <HistoryPanel
          v-else-if="active === 'history'"
          :bases="bases"
          :connected="connected"
          :revision="revision"
          @changed="refresh"
          @navigate="active = $event"
        />
        <KnowledgeGraphPanel
          v-else-if="active === 'graph'"
          :bases="bases"
          :connected="connected"
          :revision="revision"
          @navigate="active = $event"
        />
      </el-main>
    </el-container>
  </el-container>
</template>
