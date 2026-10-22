export function graphView(graph, query = '', limit = 1) {
  const needle = query.trim().toLowerCase()
  const models = graph.nodes.filter((node) => ['Model', 'Conclusion'].includes(node.kind)
    && node.title.toLowerCase().includes(needle)).sort((a, b) => a.title.localeCompare(b.title))
  const roots = models.slice(0, limit)
  const selected = new Set(roots.map((node) => node.uid))
  const includeTargets = (types) => {
    const current = new Set(selected)
    for (const edge of graph.edges) {
      if (current.has(edge.source) && types.includes(edge.type)) selected.add(edge.target)
    }
  }
  for (const edge of graph.edges) {
    if (selected.has(edge.target) && edge.type === 'CONCLUDES') selected.add(edge.source)
  }
  includeTargets(['BELONGS_TO', 'HAS_FEATURE', 'HAS_CONDITION', 'HAS_SOURCE', 'DOCUMENTED_BY'])
  includeTargets(['COMPARES'])
  for (const edge of graph.edges) {
    if (selected.has(edge.target) && edge.type === 'ASSERTS') selected.add(edge.source)
  }
  const nodes = graph.nodes.filter((node) => selected.has(node.uid))
  const edges = graph.edges.filter((edge) => selected.has(edge.source) && selected.has(edge.target))
  return {
    nodes, edges, matched_models: models.length, shown_models: roots.length,
    total_nodes: graph.nodes.length, total_edges: graph.edges.length,
  }
}
