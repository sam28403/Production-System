# 2026-10-22 列车识别规则导入记录

本次向“中国铁路”知识库（编号 2）新增 183 条、修正 1 条规则。
当前合计 184 条，其中启用 173 条，停用待核对 11 条。

## 来源与范围

- [China-EMU 全部车型目录](https://www.china-emu.cn/Trains/ALL/)，读取 186 个 CR/CRH 目录条目、176 个详情记录，无下载失败。
- [维基百科中国国家铁路集团动车组列表](https://zh.wikipedia.org/wiki/中國國家鐵路集團動車組列表)，59 条车型或对应阶段记录作参数比较，其他变型只作所属平台辅助核对。
- [维基百科 CR400AF 专题](https://zh.wikipedia.org/wiki/复兴号CR400AF型电力动车组)，辅助核对原规则范围与速度口径。
- 只覆盖此次目录快照中名称明确的 CR、CRH 车型；不包括 CJ、KCIC、LCR、非 CR/CRH 动车或未命名概念车。
- 包含目录列出的样车、历史车型及改造车型，不将它们描述成全部现役载客车型。
- “全部”指这个目录快照的明确车型覆盖，不表示所有历史批次、所有外观特征或所有可能的逻辑规则已穷尽。

## 参数口径与候选结论

数值条件使用具体型号 China-EMU 详情页的标签和数值，不把目录中未标明口径的速度数字直接解释为设计或运营速度。
运营、设计和试验速度独立保存在来源数据中；未提供的值保留为未知，不填零，不从母型继承。
默认识别条件采用已知设计速度、运营速度、动力编组和车辆数量；试验纪录保存于来源数据，未作为每条规则的必填前提。
维基百科只补充平台品牌与动力形式，不用母型速度覆盖变型参数。样车与出口条目不自动添加品牌条件。
样车记录中的运营速度可能是目标速度，因此不将它作为已投入运营的条件，另使用“试验样车”状态。
车辆数量按动力编组的全部车辆计算，包含动力集中动车组中的动力车；灵活编组不强制转换为固定数量。
同一参数组合可能对应多个型号，所以这些规则的结论表示候选，不表示唯一型号认定。后续推理必须保留全部符合条件的候选，不能只取第一条。
未按照片或型号后缀猜测涂装、头型、用途、制造商或高寒能力。外观条件仍需逐车型核对后手工补充。
本记录描述首次规则导入。后续已接入推理引擎，见 [推理文档](inference.md)。

## 原手工规则修正

- 保留原规则编号 2、知识库归属、优先级和启用状态。
- 将“CR400AF系列”改为“CR400AF 候选识别”，结论收窄为候选车型 CR400AF。
- 不再让“系列”同时等于 CR400AF 和复兴号，复兴号使用独立“品牌”字段。
- 移除没有逐车型来源支持的红色、银色外观前提；8 辆编组仅用于候选判断，不代表整个系列都只有 8 辆。
- China-EMU 的 CR400AF 详情为设计 350、运营 350、试验 385 km/h；维基百科专题分别列设计 400、运营 350、试验 420 km/h，不能无说明混用。
- 本次采用 China-EMU 的具体车型口径。来源的指标定义、批次与时间范围不同，差异不代表某一来源必然错误；此口径也不是已核定的铁路官方标准。
- 数据库备份和原规则完整快照保存在 data/backups/，不发布到网页。

## 分系列覆盖

| 系列 | 合计 | 启用 | 待核对 |
| --- | ---: | ---: | ---: |
| CR200J | 31 | 31 | 0 |
| CR220J | 8 | 8 | 0 |
| CR300AF | 3 | 3 | 0 |
| CR300BF | 3 | 3 | 0 |
| CR400AF | 22 | 21 | 1 |
| CR400BF | 28 | 27 | 1 |
| CR450AF | 4 | 1 | 3 |
| CR450BF | 4 | 1 | 3 |
| CRH1 | 7 | 7 | 0 |
| CRH2 | 20 | 19 | 1 |
| CRH3 | 10 | 9 | 1 |
| CRH380A | 11 | 11 | 0 |
| CRH380B | 8 | 8 | 0 |
| CRH380C | 2 | 2 | 0 |
| CRH380D | 2 | 2 | 0 |
| CRH5 | 8 | 7 | 1 |
| CRH6 | 13 | 13 | 0 |

## 停用条目

| 型号 | 原因 |
| --- | --- |
| CRH2A(货运) | 目录名 CRH2A(货运)，详情名 CRH2A(统型) |
| CRH3A(技术提升型) | 目录名 CRH3A(技术提升型)，详情名 CRH3A |
| CRH5H | 目录名 CRH5H，详情名 CRH5G |
| CR450AF(样车2) | 目录无详情页 |
| CR450AF | 目录无详情页 |
| CR450AF-A(样车) | 目录无详情页 |
| CR450BF(样车2) | 目录无详情页 |
| CR450BF | 目录无详情页 |
| CR450BF-A(样车) | 目录无详情页 |
| CR400AF-BX | 目录无详情页 |
| CR400BF-BX | 目录无详情页 |

以下目录项没有生成额外规则：

- CR400BF-*：型号通配占位符。
- CR300AF：重复目录名称。

## 两处来源的参数差异

共 37 个比较记录存在数值或写法差异；以下只是来源差异，不能直接认定为等价标准下的错误。

| 型号 | 指标 | China-EMU（采用） | 维基百科（参考） |
| --- | --- | --- | --- |
| CR200JS-G | 动力编组 | 3M9T | 2DM1EM9T |
| CR300AF | 设计速度 | 250 | 300 |
| CR300BF | 设计速度 | 250 | 300 |
| CR400AF | 设计速度 | 350 | 400 |
| CR400AF-A | 设计速度 | 350 | 400 |
| CR400AF-B | 设计速度 | 350 | 400 |
| CR400AF-C | 设计速度 | 350 | 400 |
| CR400AF-Z | 设计速度 | 350 | 400 |
| CR400AF-AZ | 设计速度 | 350 | 400 |
| CR400AF-BZ | 设计速度 | 350 | 400 |
| CR400AF-BS | 设计速度 | 350 | 400 |
| CR400BF | 设计速度 | 350 | 400 |
| CR400BF-A | 设计速度 | 350 | 400 |
| CR400BF-B | 设计速度 | 350 | 400 |
| CR400BF-G | 设计速度 | 350 | 400 |
| CR400BF-C | 设计速度 | 350 | 400 |
| CR400BF-Z | 设计速度 | 350 | 400 |
| CR400BF-AZ | 设计速度 | 350 | 400 |
| CR400BF-BZ | 设计速度 | 350 | 400 |
| CR400BF-GZ | 设计速度 | 350 | 400 |
| CR400BF-S | 设计速度 | 350 | 400 |
| CR400BF-AS | 设计速度 | 350 | 400 |
| CR400BF-BS | 设计速度 | 350 | 400 |
| CR400BF-GS | 设计速度 | 350 | 400 |
| CRH1A-200 | 设计速度 | 220 | 250 |
| CRH1A-200 | 运营速度 | 210 | 200 |
| CRH2C(一阶段) | 设计速度 | 300 | 350 |
| CRH2C(一阶段) | 运营速度 | 300 | 310 |
| CRH3A(城际版) | 运营速度 | 250 | 220 |
| CRH3A-A | 运营速度 | 200 | 160 |
| CRH3C(一阶段) | 设计速度 | 320 | 350 |
| CRH5A | 设计速度 | 250 | 310 |
| CRH5E | 设计速度 | 250 | 310 |
| CRH5G | 设计速度 | 250 | 310 |
| CRH6A | 设计速度 | 200 | 250 |
| CRH6A-A | 设计速度 | 200 | 250 |
| CRH6F | 设计速度 | 160 | 180 |
| CRH6F-A | 设计速度 | 160 | 180 |
| CRH380AM | 设计速度 | 450 | 500 |

## 完整型号清单

| 型号 | 状态 | 主来源 |
| --- | --- | --- |
| CR200J1(样车) | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-10011-101-S.html) |
| CR200J1(长编组样车) | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-10012-102-S.html) |
| CR200J2(样车) | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-10013-101-S.html) |
| CR200J2(长编组样车) | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-10014-102-S.html) |
| CR200J3(样车) | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-10015-101-S.html) |
| CR200J3(长编组样车) | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-10016-102-S.html) |
| CR200J1-A | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-10021-101-S.html) |
| CR200J1-A(长编组) | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-10022-102-S.html) |
| CR200J2-A | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-10023-101-S.html) |
| CR200J3-A | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-10025-101-S.html) |
| CR200J3-A(长编组) | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-10026-102-S.html) |
| CR200JN(试制) | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-10029-107-S.html) |
| CR200J1-B | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-10051-101-S.html) |
| CR200J2-B | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-10053-101-S.html) |
| CR200J3-B | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-10055-101-S.html) |
| CR200J3-B(跨国版) | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-10057-101-S.html) |
| CR200JS-G | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-10058-106-S.html) |
| CR200J1-B(长编组) | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-10091-102-S.html) |
| CR200J3-B(长编组) | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-10092-102-S.html) |
| CR200J(乌兹别克斯坦) | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-10099-101-S.html) |
| CR200J1-C | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-10101-101-S.html) |
| CR200J1-C(18编组) | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-10102-102-S.html) |
| CR200J1-D | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-10103-101-S.html) |
| CR200J1-C(19编组) | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-10104-102-S.html) |
| CR200J2-C(18编组) | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-10105-102-S.html) |
| CR200J3-C | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-10111-101-S.html) |
| CR200J3-C(18编组) | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-10112-102-S.html) |
| CR200J3-C(19编组) | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-10114-102-S.html) |
| CR200J1-J | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-10198-103-S.html) |
| CR200J3-J | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-10200-103-S.html) |
| CR200JN | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-10202-106-S.html) |
| CR220J1-H | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-10300-102-S.html) |
| CR220J3-H | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-10301-102-S.html) |
| CR220J1(样车) | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-10302-101-S.html) |
| CR220J1(货运) | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-10303-104-S.html) |
| CR220J3(样车) | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-10304-101-S.html) |
| CR220J3(货运) | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-10305-104-S.html) |
| CR220J1 | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-10311-101-S.html) |
| CR220J3 | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-10331-101-S.html) |
| CR300AF(样车) | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-11031-101-S.html) |
| CR300AF | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-11032-101-S.html) |
| CR300AF-H | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-11033-101-S.html) |
| CR300BF(样车) | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-11035-101-S.html) |
| CR300BF | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-11036-101-S.html) |
| CR300BF-H | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-11037-101-S.html) |
| CRH6A-A(2.0) | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-11101-201-S.html) |
| CRH6F(2.0) | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-11102-201-S.html) |
| CRH6F-A(2.0) | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-11103-201-S.html) |
| CR400AF(样车) | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-12001-101-S.html) |
| CR400AF | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-12002-101-S.html) |
| CR400AF(双控) | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-12003-101-S.html) |
| CR400AF-A | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-12010-101-S.html) |
| CR400AF-B | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-12011-101-S.html) |
| CR400AF-G | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-12012-101-S.html) |
| CR400AF-G(原可变轨距) | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-12013-105-S.html) |
| CR400AF-J | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-12014-103-S.html) |
| CR400AF—S | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-12015-101-S.html) |
| CR400AF-J(原公务车) | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-12016-103-S.html) |
| CR400AF-C | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-12110-101-S.html) |
| CR400AF-Z | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-12111-101-S.html) |
| CR400AF-AZ | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-12112-101-S.html) |
| CR400AF-BZ | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-12113-101-S.html) |
| CR400AF-S | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-12121-101-S.html) |
| CR400AF-AS | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-12123-101-S.html) |
| CR400AF-BS | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-12124-101-S.html) |
| CR400AF-AE | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-12125-102-S.html) |
| CR400AF-X | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-12201-101-S.html) |
| CR400AF-AX | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-12202-101-S.html) |
| CR400AF-AE(二阶段) | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-12206-102-S.html) |
| CR400BF(样车) | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-13031-101-S.html) |
| CR400BF | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-13032-101-S.html) |
| CR400BF-A | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-13033-101-S.html) |
| CR400BF-B | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-13034-101-S.html) |
| CR400BF-G | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-13036-101-S.html) |
| CR400BF(原可变轨距) | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-13050-105-S.html) |
| CR400BF-G(原可变轨距) | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-13051-105-S.html) |
| CR400BF-C | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-13100-101-S.html) |
| CR400BF-C(冬奥版) | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-13101-101-S.html) |
| CR400BF-Z | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-13111-101-S.html) |
| CR400BF-Z(亚运版) | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-13112-101-S.html) |
| CR400BF-AZ | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-13113-101-S.html) |
| CR400BF-BZ | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-13114-101-S.html) |
| CR400BF-GZ | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-13115-101-S.html) |
| CR400BF-S | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-13120-101-S.html) |
| CR400BF-AS | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-13121-101-S.html) |
| CR400BF-BS | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-13122-101-S.html) |
| CR400BF-GS | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-13123-101-S.html) |
| CR400BF-X | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-13201-101-S.html) |
| CR400BF-AX | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-13202-101-S.html) |
| CR400BF-GX | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-13205-101-S.html) |
| CR400BF-J-0001 | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-13300-103-S.html) |
| CR400BF-J-0003 | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-13301-103-S.html) |
| CR400BF-A(纵向卧铺) | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-13308-102-S.html) |
| CR400BF—S | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-13309-101-S.html) |
| CR400BF-Z(双层) | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-13400-101-S.html) |
| CR400BF-Z(纵向卧铺) | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-13401-102-S.html) |
| CRH1A-200 | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-21001-101-S.html) |
| CRH1A-250 | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-21002-101-S.html) |
| CRH1B | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-21003-101-S.html) |
| CRH1E | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-21004-102-S.html) |
| CRH1B(1E头型) | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-21005-101-S.html) |
| CRH1A-A | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-21006-101-S.html) |
| CRH1E(NG) | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-21007-102-S.html) |
| CRH2-300 | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-22000-101-S.html) |
| CRH2A | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-22001-101-S.html) |
| CRH2A(统型) | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-22002-101-S.html) |
| CRH2A(货运) | 待核对 | [资料](https://www.china-emu.cn/Trains/Model/Detail-22002-104-S.html) |
| CRH2A(综合检测车) | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-22003-103-S.html) |
| CRH2B | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-22004-101-S.html) |
| CRH2B(2A头型) | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-22005-101-S.html) |
| CRH2C(一阶段) | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-22006-101-S.html) |
| CRH2C(二阶段) | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-22007-101-S.html) |
| CRH2C(综合检测车) | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-22008-103-S.html) |
| CRH380A实验车 | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-22009-103-S.html) |
| CRH2E | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-22010-102-S.html) |
| CRH2J | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-22011-103-S.html) |
| CRH2A(NG) | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-22012-101-S.html) |
| CRH2E(NG高寒) | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-22013-102-S.html) |
| CRH2E(NG) | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-22014-102-S.html) |
| CRH2E(纵向) | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-22015-102-S.html) |
| CRH2G | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-22016-101-S.html) |
| CRH2G(技术提升型) | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-22017-101-S.html) |
| CRH2H | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-22018-101-S.html) |
| CRH3A(城际版) | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-23001-201-S.html) |
| CRH3A | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-23002-101-S.html) |
| CRH3A(技术提升型) | 待核对 | [资料](https://www.china-emu.cn/Trains/Model/Detail-23002-101-S.html) |
| CRH3A-A(样车) | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-23004-201-S.html) |
| CRH3A-A | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-23005-201-S.html) |
| CRH3E | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-23010-102-S.html) |
| CRH3C(一阶段) | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-23011-101-S.html) |
| CRH3C(二阶段) | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-23012-101-S.html) |
| CRH3X | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-23013-101-S.html) |
| CRH3X-350 | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-23014-101-S.html) |
| CRH5A | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-25001-101-S.html) |
| CRH5E | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-25002-102-S.html) |
| CRH5E(纵向) | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-25003-102-S.html) |
| CRH5G | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-25004-101-S.html) |
| CRH5H | 待核对 | [资料](https://www.china-emu.cn/Trains/Model/Detail-25004-101-S.html) |
| CRH5G(大功率) | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-25005-101-S.html) |
| CRH5G(技术提升型) | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-25006-101-S.html) |
| CRH5J | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-25007-103-S.html) |
| CRH6A | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-26001-201-S.html) |
| CRH6A(中期) | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-26002-201-S.html) |
| CRH6A(后期) | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-26003-201-S.html) |
| CRH6A(舒适版) | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-26004-101-S.html) |
| CRH6A(智能版) | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-26006-201-S.html) |
| CRH6A-A | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-26008-201-S.html) |
| CRH6A-A(智能版) | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-26009-201-S.html) |
| CRH6F | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-26011-201-S.html) |
| CRH6F-A | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-26012-201-S.html) |
| CRH6F-A(智能版) | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-26013-201-S.html) |
| CRH380AJ(统型) | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-30000-103-S.html) |
| CRH380A | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-30001-101-S.html) |
| CRH380A(统型) | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-30002-101-S.html) |
| CRH380A(港铁) | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-30003-101-S.html) |
| CRH380AJ | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-30004-103-S.html) |
| CRH380AJ(原公务车) | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-30005-103-S.html) |
| CRH380AL(一阶段) | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-30006-101-S.html) |
| CRH380AL(二阶段) | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-30007-101-S.html) |
| CRH380AL(三阶段) | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-30008-101-S.html) |
| CRH380AM | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-30009-103-S.html) |
| CRH380AN | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-30010-101-S.html) |
| CRH380BG | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-31001-101-S.html) |
| CRH380B | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-31002-101-S.html) |
| CRH380BG(统型) | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-31003-101-S.html) |
| CRH380BJ | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-31004-103-S.html) |
| CRH380BJ-A | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-31005-103-S.html) |
| CRH380BL(一阶段) | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-31006-101-S.html) |
| CRH380BL(二阶段) | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-31007-101-S.html) |
| CRH380BL(三阶段) | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-31008-101-S.html) |
| CRH380B(货运) | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-31009-104-S.html) |
| CRH380CL | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-31010-101-S.html) |
| CRH380D | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-32001-101-S.html) |
| CRH380D(统型) | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-32002-101-S.html) |
| CR450AF(样车) | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-9601-103-S.html) |
| CR450BF(样车) | 启用 | [资料](https://www.china-emu.cn/Trains/Model/Detail-9801-103-S.html) |
| CR450AF(样车2) | 待核对 | [资料](https://www.china-emu.cn/Trains/ALL/) |
| CR450AF | 待核对 | [资料](https://www.china-emu.cn/Trains/ALL/) |
| CR450AF-A(样车) | 待核对 | [资料](https://www.china-emu.cn/Trains/ALL/) |
| CR450BF(样车2) | 待核对 | [资料](https://www.china-emu.cn/Trains/ALL/) |
| CR450BF | 待核对 | [资料](https://www.china-emu.cn/Trains/ALL/) |
| CR450BF-A(样车) | 待核对 | [资料](https://www.china-emu.cn/Trains/ALL/) |
| CR400AF-BX | 待核对 | [资料](https://www.china-emu.cn/Trains/ALL/) |
| CR400BF-BX | 待核对 | [资料](https://www.china-emu.cn/Trains/ALL/) |

## 复现与保护

```bash
npm run data:collect
npm run data:build
npm run data:import -- --base-id 2
```

采集器缓存原始页面并对站点数据库锁定错误重试。导入器先备份，再在事务内写入。
导入键在知识库内唯一；重复执行跳过已导入规则，包括已经手工修改或停用的规则。
普通导入不覆盖手工规则。本次修正原规则显式使用 --correct-rule-id 2，重复运行无需再次指定。
data/railway/ 保存目录事实、维基百科参考参数、规则包和导入结果；data/sources/ 的原始页面缓存及备份均已忽略。
