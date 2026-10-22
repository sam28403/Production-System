<script setup>
import { computed } from 'vue'

const props = defineProps({ section: String })
defineEmits(['navigate'])
const content = computed(() => ({
  inference: { title: '推理工作台待接入' },
  history: { title: '实验记录待接入' },
}[props.section]))
</script>

<template>
  <el-card shadow="never">
    <el-result icon="info" :title="content.title">
      <template #extra>
        <div class="result-actions"><el-button type="primary" @click="$emit('navigate', 'knowledge')">前往知识库管理</el-button></div>
      </template>
    </el-result>
  </el-card>
</template>
