<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import cytoscape from 'cytoscape'
import { graphStyle } from './graph-style'

const props = defineProps({ graph: Object })
const emit = defineEmits(['select'])
const container = ref()
let cy
let observer

function draw() {
  if (!cy) return
  cy.elements().remove()
  cy.add([
    ...props.graph.nodes.map((node) => ({ data: { ...node, id: node.uid } })),
    ...props.graph.edges.map((edge) => ({ data: {
      ...edge, id: edge.uid, title: props.graph.edge_kinds[edge.type],
    } })),
  ])
  cy.layout({ name: 'cose', animate: false, padding: 40, nodeRepulsion: () => 12000 }).run()
}

onMounted(() => {
  cy = cytoscape({
    container: container.value, style: graphStyle,
    minZoom: 0.15, maxZoom: 3, wheelSensitivity: 0.2,
  })
  cy.on('tap', 'node', (event) => {
    cy.elements().addClass('faded')
    event.target.closedNeighborhood().removeClass('faded')
    emit('select', event.target.data())
  })
  cy.on('tap', (event) => {
    if (event.target === cy) {
      cy.elements().removeClass('faded')
      emit('select', null)
    }
  })
  observer = new ResizeObserver(() => { cy.resize(); cy.fit(undefined, 40) })
  observer.observe(container.value)
  draw()
})
watch(() => props.graph, draw)
onBeforeUnmount(() => { observer?.disconnect(); cy?.destroy() })
defineExpose({ fit: () => cy?.fit(undefined, 40) })
</script>

<template>
  <div ref="container" class="graph-canvas" role="img" aria-label="铁路知识图谱" />
</template>
