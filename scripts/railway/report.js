import { readFileSync, writeFileSync } from 'node:fs'

const read = (file) => JSON.parse(readFileSync(`data/railway/${file}`, 'utf8'))
const { rules, comparisons, excluded } = read('rules.json')
const result = read('import-result.json')
const catalog = read('catalog.json')
const wiki = read('wikipedia-reference.json')
const families = [...new Set(rules.map((rule) => rule.provenance.family))]
const pending = rules.filter((rule) => !rule.enabled)
const conflicts = comparisons.filter((item) => item.differences.length)
const labels = { design_speed: '设计速度', operating_speed: '运营速度', formation: '动力编组' }
const lines = [
  '# 2026-10-22 列车识别规则导入记录',
  '',
  `本次向“中国铁路”知识库（编号 ${result.baseId}）新增 ${result.inserted} 条、修正 ${result.corrected} 条规则。`,
  `当前合计 ${result.counts.total} 条，其中启用 ${result.counts.enabled} 条，停用待核对 ${result.counts.disabled} 条。`,
  '',
  '## 来源与范围',
  '',
  `- [China-EMU 全部车型目录](${catalog.catalog_url})，读取 ${catalog.entries.length} 个 CR/CRH 目录条目、${catalog.models.length} 个详情记录，无下载失败。`,
  `- [维基百科中国国家铁路集团动车组列表](${wiki.source_url})，${comparisons.length} 条车型或对应阶段记录作参数比较，其他变型只作所属平台辅助核对。`,
  '- [维基百科 CR400AF 专题](https://zh.wikipedia.org/wiki/复兴号CR400AF型电力动车组)，辅助核对原规则范围与速度口径。',
  '- 只覆盖此次目录快照中名称明确的 CR、CRH 车型；不包括 CJ、KCIC、LCR、非 CR/CRH 动车或未命名概念车。',
  '- 包含目录列出的样车、历史车型及改造车型，不将它们描述成全部现役载客车型。',
  '- “全部”指这个目录快照的明确车型覆盖，不表示所有历史批次、所有外观特征或所有可能的逻辑规则已穷尽。',
  '',
  '## 参数口径与候选结论',
  '',
  '数值条件使用具体型号 China-EMU 详情页的标签和数值，不把目录中未标明口径的速度数字直接解释为设计或运营速度。',
  '运营、设计和试验速度独立保存在来源数据中；未提供的值保留为未知，不填零，不从母型继承。',
  '默认识别条件采用已知设计速度、运营速度、动力编组和车辆数量；试验纪录保存于来源数据，未作为每条规则的必填前提。',
  '维基百科只补充平台品牌与动力形式，不用母型速度覆盖变型参数。样车与出口条目不自动添加品牌条件。',
  '样车记录中的运营速度可能是目标速度，因此不将它作为已投入运营的条件，另使用“试验样车”状态。',
  '车辆数量按动力编组的全部车辆计算，包含动力集中动车组中的动力车；灵活编组不强制转换为固定数量。',
  '同一参数组合可能对应多个型号，所以这些规则的结论表示候选，不表示唯一型号认定。后续推理必须保留全部符合条件的候选，不能只取第一条。',
  '未按照片或型号后缀猜测涂装、头型、用途、制造商或高寒能力。外观条件仍需逐车型核对后手工补充。',
  '本记录描述首次规则导入。后续已接入推理引擎，见 [推理文档](inference.md)。',
  '',
  '## 原手工规则修正',
  '',
  '- 保留原规则编号 2、知识库归属、优先级和启用状态。',
  '- 将“CR400AF系列”改为“CR400AF 候选识别”，结论收窄为候选车型 CR400AF。',
  '- 不再让“系列”同时等于 CR400AF 和复兴号，复兴号使用独立“品牌”字段。',
  '- 移除没有逐车型来源支持的红色、银色外观前提；8 辆编组仅用于候选判断，不代表整个系列都只有 8 辆。',
  '- China-EMU 的 CR400AF 详情为设计 350、运营 350、试验 385 km/h；维基百科专题分别列设计 400、运营 350、试验 420 km/h，不能无说明混用。',
  '- 本次采用 China-EMU 的具体车型口径。来源的指标定义、批次与时间范围不同，差异不代表某一来源必然错误；此口径也不是已核定的铁路官方标准。',
  '- 数据库备份和原规则完整快照保存在 data/backups/，不发布到网页。',
  '',
  '## 分系列覆盖',
  '',
  '| 系列 | 合计 | 启用 | 待核对 |',
  '| --- | ---: | ---: | ---: |',
]
for (const family of families.sort()) {
  const group = rules.filter((rule) => rule.provenance.family === family)
  const enabled = group.filter((rule) => rule.enabled).length
  lines.push(`| ${family} | ${group.length} | ${enabled} | ${group.length - enabled} |`)
}
lines.push('', '## 停用条目', '', '| 型号 | 原因 |', '| --- | --- |')
for (const rule of pending) lines.push(`| ${rule.conclusion} | ${rule.provenance.issue} |`)
lines.push('', '以下目录项没有生成额外规则：', '')
for (const item of excluded) lines.push(`- ${item.name}：${item.reason}。`)
lines.push('', '## 两处来源的参数差异', '',
  `共 ${conflicts.length} 个比较记录存在数值或写法差异；以下只是来源差异，不能直接认定为等价标准下的错误。`, '',
  '| 型号 | 指标 | China-EMU（采用） | 维基百科（参考） |', '| --- | --- | --- | --- |')
for (const item of conflicts) {
  for (const difference of item.differences) {
    lines.push(`| ${item.model} | ${labels[difference.field]} | ${difference.emu} | ${difference.wikipedia} |`)
  }
}
lines.push('', '## 完整型号清单', '', '| 型号 | 状态 | 主来源 |', '| --- | --- | --- |')
for (const rule of rules) {
  lines.push(`| ${rule.conclusion} | ${rule.enabled ? '启用' : '待核对'} | [资料](${rule.source_url}) |`)
}
lines.push('', '## 复现与保护', '', '```bash', 'npm run data:collect', 'npm run data:build',
  'npm run data:import -- --base-id 2', '```', '',
  '采集器缓存原始页面并对站点数据库锁定错误重试。导入器先备份，再在事务内写入。',
  '导入键在知识库内唯一；重复执行跳过已导入规则，包括已经手工修改或停用的规则。',
  '普通导入不覆盖手工规则。本次修正原规则显式使用 --correct-rule-id 2，重复运行无需再次指定。',
  'data/railway/ 保存目录事实、维基百科参考参数、规则包和导入结果；data/sources/ 的原始页面缓存及备份均已忽略。', '')
writeFileSync('docs/railway-import-2026-10-22.md', lines.join('\n'))
console.log('Generated docs/railway-import-2026-10-22.md')
