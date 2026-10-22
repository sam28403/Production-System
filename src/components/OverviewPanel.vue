<script setup>
import { Collection, Document, Files, Histogram, Plus, Right } from '@element-plus/icons-vue'

defineProps({ stats: Object, bases: Array, connected: Boolean })
defineEmits(['navigate'])
const metrics = [
  { key: 'knowledgeBases', label: '知识库', icon: Collection, unit: '个' },
  { key: 'rules', label: '产生式规则', icon: Document, unit: '条' },
  { key: 'facts', label: '事实条目', icon: Files, unit: '项' },
  { key: 'runs', label: '推理实验', icon: Histogram, unit: '次' },
]
</script>

<template>
  <el-row :gutter="20" class="metrics-row">
    <el-col v-for="metric in metrics" :key="metric.key" :xs="12" :sm="12" :lg="6">
      <el-card shadow="never" class="metric-card">
        <el-statistic :title="metric.label" :value="stats[metric.key]">
          <template #suffix><span class="stat-unit">{{ metric.unit }}</span></template>
        </el-statistic>
        <el-icon class="metric-icon" :size="24"><component :is="metric.icon" /></el-icon>
      </el-card>
    </el-col>
  </el-row>
  <el-card shadow="never" class="section-gap">
    <template #header>
      <div class="card-heading"><strong>实验流程</strong></div>
    </template>
    <el-steps :active="stats.runs ? 4 : stats.facts ? 3 : stats.rules ? 2 : bases.length ? 1 : 0" align-center class="experiment-steps">
      <el-step title="创建知识库" />
      <el-step title="配置规则" />
      <el-step title="输入事实" />
      <el-step title="查看推理" />
    </el-steps>
  </el-card>
  <el-row :gutter="20">
    <el-col :xs="24" :lg="16">
      <el-card shadow="never" class="section-gap">
        <template #header>
          <div class="card-heading">
            <strong>我的知识库 <span class="muted-count">{{ bases.length }}</span></strong>
            <el-button link type="primary" @click="$emit('navigate', 'knowledge')">管理知识库<el-icon><Right /></el-icon></el-button>
          </div>
        </template>
        <el-empty v-if="!bases.length" description="还没有知识库，先为实验建立一个空间" :image-size="100">
          <el-button type="primary" :icon="Plus" @click="$emit('navigate', 'knowledge')">创建知识库</el-button>
        </el-empty>
        <el-table v-else :data="bases.slice(0, 5)">
          <el-table-column prop="name" label="知识库名称" min-width="160" show-overflow-tooltip />
          <el-table-column prop="rule_count" label="规则" width="80" />
          <el-table-column prop="fact_count" label="事实" width="80" />
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="row.rule_count ? 'success' : 'info'" size="small">{{ row.rule_count ? '已配置规则' : '待配置' }}</el-tag>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </el-col>
    <el-col :xs="24" :lg="8">
      <el-card shadow="never" class="section-gap">
        <template #header><strong>环境状态</strong></template>
        <el-descriptions :column="1" :label-width="92">
          <el-descriptions-item label="前端应用"><el-tag type="success" size="small">运行中</el-tag></el-descriptions-item>
          <el-descriptions-item label="后端服务"><el-tag :type="connected ? 'success' : 'danger'" size="small">{{ connected ? '已连接' : '未连接' }}</el-tag></el-descriptions-item>
          <el-descriptions-item label="数据库"><el-tag :type="connected ? 'success' : 'info'" size="small">{{ connected ? 'SQLite 已连接' : '等待连接' }}</el-tag></el-descriptions-item>
          <el-descriptions-item label="实验主题"><el-text>中国铁路列车识别</el-text></el-descriptions-item>
          <el-descriptions-item label="推理引擎"><el-tag :type="connected ? 'success' : 'info'" size="small">{{ connected ? '已接入' : '等待连接' }}</el-tag></el-descriptions-item>
        </el-descriptions>
      </el-card>
    </el-col>
  </el-row>
</template>
