<script setup>
import { computed, ref, watch } from 'vue'
import { useKnowledgeGraph } from '../../composables/useKnowledgeGraph'
import GraphCanvas from './GraphCanvas.vue'
import GraphDetails from './GraphDetails.vue'
import { nodeColors } from './graph-style'
import './graph.css'

const props = defineProps({ bases: Array, connected: Boolean, revision: Number })
defineEmits(['navigate'])
const { baseId, status, graph, loading, syncing, error, query, limit, check, load, sync } = useKnowledgeGraph(props)
const selected = ref(null)
const canvas = ref()
const presentKinds = computed(() => Object.entries(graph.value?.node_kinds || {})
  .filter(([kind]) => graph.value.nodes.some((node) => node.kind === kind)))
watch(graph, () => { selected.value = null })
</script>

<template>
  <el-card v-if="!bases.length" shadow="never">
    <el-empty description="暂无知识库">
      <el-button type="primary" @click="$emit('navigate', 'knowledge')">创建知识库</el-button>
    </el-empty>
  </el-card>
  <el-card v-else v-loading="loading" shadow="never">
    <template #header>
      <div class="card-heading">
        <strong>铁路知识图谱</strong>
        <el-tag :type="status?.connected ? 'success' : 'info'">{{ status?.connected ? 'Neo4j 已连接' : 'Neo4j 未连接' }}</el-tag>
      </div>
    </template>
    <div class="graph-toolbar">
      <el-select v-model="baseId" :disabled="syncing" aria-label="选择知识库">
        <el-option v-for="base in bases" :key="base.id" :label="base.name" :value="base.id" />
      </el-select>
      <el-button :disabled="loading || syncing || !connected" @click="check">重新检测</el-button>
      <el-button type="primary" :loading="syncing" :disabled="loading || !status?.connected" @click="sync">同步图谱</el-button>
      <el-link v-if="status?.browser_url" :href="status.browser_url" target="_blank" rel="noopener noreferrer" type="primary">打开 Neo4j Browser</el-link>
    </div>
    <el-alert v-if="error" :title="error" type="error" show-icon :closable="false" class="section-gap" />
    <el-empty v-if="status && !status.connected" :description="status.configured ? '暂时无法连接 Neo4j' : 'Neo4j 尚未配置'" :image-size="100" />
    <template v-else-if="status?.connected">
      <div class="graph-summary">
        <el-tag v-if="status.stale" type="warning">待同步</el-tag>
        <el-text v-if="status.metadata" type="info">
          {{ status.metadata.nodes }} 个节点，{{ status.metadata.edges }} 条关系
        </el-text>
        <el-text v-if="status.metadata" type="info">
          同步时间：{{ new Date(status.metadata.synced_at).toLocaleString('zh-CN', { hour12: false }) }}
        </el-text>
      </div>
      <el-empty v-if="!status.metadata" description="暂无图谱数据" :image-size="100" />
      <template v-else>
        <div class="graph-toolbar">
          <el-input v-model="query" placeholder="搜索车型" clearable @keyup.enter="load()" />
          <el-select v-model="limit" aria-label="显示车型数量">
            <el-option v-for="count in [1, 3, 6, 12]" :key="count" :value="count" :label="`${count} 个车型`" />
          </el-select>
          <el-button :disabled="loading || syncing" @click="load()">查询</el-button>
        </div>
        <template v-if="graph">
          <div class="graph-summary">
            <el-text type="info">匹配 {{ graph.matched_models }} 个车型，展示 {{ graph.shown_models }} 个</el-text>
            <el-button link type="primary" @click="canvas?.fit()">适应画布</el-button>
          </div>
          <el-tabs>
            <el-tab-pane label="关系图">
              <div class="graph-legend">
                <span v-for="[kind, name] in presentKinds" :key="kind">
                  <i :style="{ backgroundColor: nodeColors[kind] }" />{{ name }}
                </span>
              </div>
              <GraphCanvas v-if="graph.nodes.length" ref="canvas" :graph="graph" @select="selected = $event" />
              <el-empty v-else description="没有找到车型" :image-size="80" />
            </el-tab-pane>
            <el-tab-pane label="节点列表">
              <el-table :data="graph.nodes" max-height="540" @row-click="selected = $event">
                <el-table-column prop="title" label="名称" min-width="220" />
                <el-table-column label="类型" width="100">
                  <template #default="{ row }">{{ graph.node_kinds[row.kind] }}</template>
                </el-table-column>
                <el-table-column label="操作" width="90">
                  <template #default="{ row }"><el-button link type="primary" @click="selected = row">查看</el-button></template>
                </el-table-column>
              </el-table>
            </el-tab-pane>
          </el-tabs>
          <GraphDetails v-if="selected" :node="selected" :graph="graph" class="graph-details" />
        </template>
      </template>
    </template>
  </el-card>
</template>
