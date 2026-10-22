<script setup>
import { computed } from 'vue'
import { ruleFields } from '../../../shared/rule-fields'
import InferenceProcess from './InferenceProcess.vue'

const props = defineProps({ run: Object })
const candidates = computed(() => props.run.result?.candidates || [])
const label = (field) => ruleFields.find((item) => item.value === field)?.label || field
const reportUrl = (format) => `/api/knowledge-bases/${props.run.knowledge_base_id}/runs/${props.run.id}/report?format=${format}`
</script>

<template>
  <el-card shadow="never" class="section-gap">
    <template #header>
      <div class="card-heading">
        <strong>实验 #{{ run.id }}</strong>
        <el-space>
          <el-link :href="reportUrl('json')" type="primary">导出 JSON</el-link>
          <el-link :href="reportUrl('md')" type="primary">导出报告</el-link>
        </el-space>
      </div>
    </template>
    <el-descriptions :column="3" border>
      <el-descriptions-item label="输入事实">{{ run.initial_facts.length }}</el-descriptions-item>
      <el-descriptions-item label="命中规则">{{ run.trace.length }}</el-descriptions-item>
      <el-descriptions-item label="候选车型">{{ candidates.length }}</el-descriptions-item>
    </el-descriptions>
    <el-alert
      v-if="run.result.unsupported_fields?.length"
      class="inference-notice"
      :title="`缺少核验资料：${run.result.unsupported_fields.map(label).join('、')}`"
      type="warning" show-icon :closable="false"
    />
    <el-alert
      v-if="run.result.invalid_rule_ids?.length"
      class="inference-notice"
      :title="`已跳过 ${run.result.invalid_rule_ids.length} 条无效规则`"
      type="warning" show-icon :closable="false"
    />
    <el-tabs>
      <el-tab-pane label="候选车型">
        <el-table :data="candidates" row-key="rule_id" stripe>
          <el-table-column type="expand">
            <template #default="{ row }">
              <el-descriptions :column="1" border class="candidate-details">
                <el-descriptions-item v-for="item in row.evidence" :key="item.field + ':' + item.value" :label="label(item.field)">
                  <el-space>
                    <span>{{ item.value }}</span>
                    <el-tag :type="item.status === 'matched' ? 'success' : 'warning'" size="small">{{ item.status === 'matched' ? '已核实' : '待核验' }}</el-tag>
                  </el-space>
                </el-descriptions-item>
                <el-descriptions-item label="来源">
                  <el-link v-if="row.source_url" :href="row.source_url" target="_blank" rel="noopener noreferrer" type="primary">查看车型资料</el-link>
                </el-descriptions-item>
              </el-descriptions>
            </template>
          </el-table-column>
          <el-table-column prop="model" label="车型" min-width="170" />
          <el-table-column prop="family" label="系列" min-width="130" />
          <el-table-column label="核实条件" width="100">
            <template #default="{ row }">{{ row.matched }} / {{ row.total }}</template>
          </el-table-column>
          <el-table-column label="匹配状态" min-width="140">
            <template #default="{ row }">
              <el-tag :type="row.status === 'supported' ? 'success' : 'warning'">{{ row.status === 'supported' ? '已知条件符合' : '待核验' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="完整规则" width="100">
            <template #default="{ row }">{{ row.rule_fired ? '已命中' : '未命中' }}</template>
          </el-table-column>
          <template #empty><el-empty :image-size="70" description="暂无兼容的候选车型" /></template>
        </el-table>
      </el-tab-pane>
      <el-tab-pane label="推理过程">
        <InferenceProcess :run="run" />
      </el-tab-pane>
      <el-tab-pane label="初始事实">
        <el-table :data="run.initial_facts" stripe>
          <el-table-column prop="name" label="事实名称" min-width="180" />
          <el-table-column label="字段" min-width="170"><template #default="{ row }">{{ label(row.field_key) }}</template></el-table-column>
          <el-table-column prop="value" label="值" min-width="100" />
        </el-table>
      </el-tab-pane>
    </el-tabs>
  </el-card>
</template>
