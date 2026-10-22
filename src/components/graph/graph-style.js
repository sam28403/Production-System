export const nodeColors = {
  Model: '#409eff', Series: '#67c23a', Feature: '#e6a23c', Rule: '#8b5cf6',
  Condition: '#909399', Fact: '#14b8a6', Source: '#f56c6c', Conclusion: '#409eff',
}

export const graphStyle = [
  {
    selector: 'node',
    style: {
      label: 'data(title)', 'background-color': (node) => nodeColors[node.data('kind')] || '#909399',
      width: (node) => node.data('kind') === 'Model' ? 56 : 30,
      height: (node) => node.data('kind') === 'Model' ? 56 : 30,
      'font-size': 11, 'text-valign': 'bottom', 'text-margin-y': 6,
      'text-wrap': 'wrap', 'text-max-width': 130, color: '#303133',
      'border-color': '#ffffff', 'border-width': 2,
    },
  },
  {
    selector: 'edge',
    style: {
      label: 'data(title)', width: 1.4, 'line-color': '#c0c4cc',
      'target-arrow-color': '#c0c4cc', 'target-arrow-shape': 'triangle',
      'curve-style': 'bezier', 'font-size': 9, color: '#909399',
      'text-rotation': 'autorotate', 'text-background-color': '#fff',
      'text-background-opacity': 0.9, 'text-background-padding': 2,
    },
  },
  {
    selector: ':selected',
    style: { 'border-color': '#303133', 'border-width': 3, 'line-color': '#409eff', 'target-arrow-color': '#409eff' },
  },
  { selector: '.faded', style: { opacity: 0.15 } },
]
