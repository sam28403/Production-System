<script setup>
import { computed } from 'vue'

const props = defineProps({ node: Object, graph: Object })
const related = computed(() => props.graph.edges.filter((edge) =>
  edge.source === props.node.uid || edge.target === props.node.uid,
).map((edge) => ({
  title: props.graph.edge_kinds[edge.type],
  source: props.graph.nodes.find((node) => node.uid === edge.source)?.title,
  target: props.graph.nodes.find((node) => node.uid === edge.target)?.title,
})))
</script>

<template>
  <el-descriptions :column="1" border>
    <el-descriptions-item label="名称">{{ node.title }}</el-descriptions-item>
    <el-descriptions-item label="类型">{{ graph.node_kinds[node.kind] }}</el-descriptions-item>
    <el-descriptions-item v-if="node.enabled !== undefined" label="规则状态">
      {{ node.enabled ? '启用' : '停用' }}
    </el-descriptions-item>
    <el-descriptions-item v-if="node.match_mode" label="条件关系">
      {{ node.match_mode === 'all' ? '全部满足' : '任一满足' }}
    </el-descriptions-item>
    <el-descriptions-item v-if="node.source_url" label="资料来源">
      <el-link :href="node.source_url" target="_blank" rel="noopener noreferrer" type="primary">查看来源</el-link>
    </el-descriptions-item>
  </el-descriptions>
  <el-table :data="related" class="inference-notice">
    <el-table-column prop="source" label="起点" min-width="160" />
    <el-table-column prop="title" label="关系" width="100" />
    <el-table-column prop="target" label="终点" min-width="160" />
  </el-table>
</template>
