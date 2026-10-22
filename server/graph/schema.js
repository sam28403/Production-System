export const nodeKinds = {
  Model: '车型', Series: '系列', Feature: '特征', Rule: '规则',
  Condition: '条件', Fact: '事实', Source: '来源', Conclusion: '结论',
}

export const edgeKinds = {
  BELONGS_TO: '属于系列', HAS_FEATURE: '资料记载', CONCLUDES: '推导候选',
  HAS_CONDITION: '要求条件', COMPARES: '比较特征', ASSERTS: '描述特征',
  HAS_SOURCE: '引用来源', DOCUMENTED_BY: '资料来源',
}
