<script setup>
import { computed, ref, watch } from 'vue'
import { formatCondition, ruleFields } from '../../../shared/rule-fields'

const props = defineProps({ run: Object })
const explanation = computed(() => props.run.result.explanation)
const candidates = computed(() => explanation.value?.candidates || [])
const selected = ref(null)
watch(candidates, (items) => { selected.value = items[0]?.rule_id || null }, { immediate: true })
const current = computed(() => candidates.value.find((item) => item.rule_id === selected.value))
const label = (field) => ruleFields.find((item) => item.value === field)?.label || field
const stateLabel = { matched: '满足', unknown: '未知', conflict: '不符合' }
</script>

<template>
  <el-timeline v-if="explanation?.steps.length" class="inference-timeline">
    <el-timeline-item
      v-for="step in explanation.steps"
      :key="step.step"
      :timestamp="`步骤 ${step.step}`"
      placement="top"
    >
      <strong>{{ label(step.field) }}：{{ step.value }}</strong>
      <p>核对 {{ step.before }} 个车型，排除 {{ step.excluded.length }} 个，保留 {{ step.remaining }} 个。</p>
      <el-collapse v-if="step.excluded.length || step.unknown.length">
        <el-collapse-item v-if="step.excluded.length" title="查看排除的车型" :name="`excluded-${step.step}`">
          {{ step.excluded.join('、') }}
        </el-collapse-item>
        <el-collapse-item v-if="step.unknown.length" title="查看该特征待核验的车型" :name="`unknown-${step.step}`">
          {{ step.unknown.join('、') }}
        </el-collapse-item>
      </el-collapse>
    </el-timeline-item>
  </el-timeline>
  <el-empty v-else :image-size="70" description="暂无筛选过程" />
  <template v-if="candidates.length">
    <div class="process-toolbar">
      <strong>候选依据</strong>
      <el-select v-model="selected" filterable aria-label="选择候选车型" class="process-model">
        <el-option v-for="item in candidates" :key="item.rule_id" :label="item.model" :value="item.rule_id" />
      </el-select>
    </div>
    <template v-if="current">
      <el-descriptions :column="1" border>
        <el-descriptions-item label="车型">{{ current.model }}</el-descriptions-item>
        <el-descriptions-item label="输入核验">
          {{ current.matched }} / {{ current.total }} 项已核实
        </el-descriptions-item>
        <el-descriptions-item v-for="item in current.evidence" :key="`${item.field}:${item.value}`" :label="label(item.field)">
          <el-space>
            <span>{{ item.value }}</span>
            <el-tag :type="item.status === 'matched' ? 'success' : 'warning'" size="small">
              {{ item.status === 'matched' ? '已核实' : '资料不足' }}
            </el-tag>
          </el-space>
        </el-descriptions-item>
        <el-descriptions-item label="资料来源">
          <el-link v-if="current.source_url" :href="current.source_url" target="_blank" rel="noopener noreferrer" type="primary">查看来源</el-link>
        </el-descriptions-item>
      </el-descriptions>
      <el-collapse class="inference-notice">
        <el-collapse-item title="查看完整规则条件" name="requirements">
          <el-tag size="small">{{ current.match_mode === 'any' ? '任一满足' : '全部满足' }}</el-tag>
          <div v-for="(item, index) in current.requirements" :key="index" class="trace-condition">
            {{ formatCondition(item) }}
            <el-tag :type="item.state === 'matched' ? 'success' : 'info'" size="small">{{ stateLabel[item.state] }}</el-tag>
          </div>
        </el-collapse-item>
      </el-collapse>
    </template>
  </template>
  <el-collapse v-if="run.trace.length" class="inference-notice">
    <el-collapse-item title="规则触发记录" name="fired">
      <el-timeline class="inference-timeline">
        <el-timeline-item v-for="step in run.trace" :key="step.step" :timestamp="`步骤 ${step.step}，R${step.rule_id}`" placement="top">
          <strong>{{ step.name }}</strong>
          <div v-for="(condition, index) in step.conditions" :key="index" class="trace-condition">
            {{ formatCondition(condition) }}
            <el-tag size="small" :type="step.states[index] === 'matched' ? 'success' : 'info'">{{ stateLabel[step.states[index]] }}</el-tag>
          </div>
          <p>结论：{{ step.conclusion }}</p>
        </el-timeline-item>
      </el-timeline>
    </el-collapse-item>
  </el-collapse>
</template>
