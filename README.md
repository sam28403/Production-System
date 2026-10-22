# 产生式系统实验平台

中国铁路 CR、CRH 系列车型识别实验。已完成网页、数据库、规则和事实编辑、推理与实验记录。
原始 `chanshengshi.py` 案例保持不变。

## 本地运行

需要 Node.js 24.15 或更高版本（使用内置 `node:sqlite`）和 npm。

```bash
npm install
npm run dev:full
```

- 网页：http://127.0.0.1:5173
- 后端健康检查：http://127.0.0.1:3001/api/health
- SQLite 文件：`data/production.sqlite`，首次启动自动创建，无需另装数据库。
- 在 WebStorm 的 npm 面板双击 `dev:full` 即可启动前后端。
- 终端按 Ctrl+C 同时关闭服务；任一服务退出时会关闭另一个服务。
- 端口固定为 5173 / 3001；被占用时需先关闭旧服务。

## 部署

生产环境建议用 Nginx 提供前端静态文件，并将 `/api/` 转发到同机运行的
Express 服务。服务器需要 Node.js 24.15 或更高版本、npm 和 Nginx。

在项目目录安装依赖并生成前端文件：

```bash
npm ci
npm run build
```

将整个项目部署到服务器上的固定目录，保留 `server/`、`shared/`、
`package.json`、`package-lock.json` 和生成的 `dist/`。创建 `.env.local`，
按需填写 Neo4j 连接信息；未配置 Neo4j 时，SQLite 与推理等功能仍可运行。
不要把含有真实密码的环境文件提交到 Git。

在项目目录启动 API 服务：

```bash
node server/index.js
```

服务监听 `127.0.0.1:3001`。生产环境应使用 systemd、进程管理器或容器保持
服务运行，并配置进程退出后自动重启。确保运行服务的系统用户可以写入
`data/`，SQLite 数据库会自动创建在 `data/production.sqlite`。部署时应将
`data/` 放在持久化磁盘上，并定期备份数据库。

Nginx 示例配置如下。将 `root` 改为实际部署目录下的 `dist` 路径：

```nginx
server {
    listen 80;
    server_name example.com;
    root /srv/production/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

启用 HTTPS 后，应将 HTTP 请求重定向到 HTTPS。部署完成后访问站点，并检查
`https://example.com/api/health` 返回的服务状态。知识图谱功能需要另行部署
Neo4j，并在 `.env.local` 中设置 URI、用户名、密码和数据库名。

## 当前能力

Vue 3 + Vite + Element Plus 默认主题、中文组件与官方图标。
Express 提供健康检查、概览统计与知识库新增、列表、删除接口。
知识库支持搜索、分页、表单验证和删除确认，数据持久保存在 SQLite。
规则支持网页内新增、编辑、查询、删除、启停、条件组合及来源记录。
规则使用说明和接口约定见 [规则管理文档](docs/rules.md)。
车型范围、规则修正与来源差异见 [车型导入记录](docs/railway-import-2026-10-22.md)。
事实管理支持按知识库新增、编辑、查询、删除，包含类型校验、搜索、筛选、分页和来源记录。
用途和接口见 [事实管理文档](docs/facts.md)。
推理工作台通过逐题问答选择特征，支持未知跳过、正向推理、候选核验、历史快照及 JSON / Markdown 文件导出。
详见 [推理文档](docs/inference.md) 和 [事实补全记录](docs/railway-facts-2026-10-22.md)。
候选车型也能查看逐项筛选过程和匹配依据。
知识图谱已完成 Neo4j 接口、数据建模、交互页面和本机连接联调，当前导入 1960 个节点、4722 条关系。
配置见 [知识图谱文档](docs/knowledge-graph.md)；Neo4j 由用户单独启动，`dev:full` 继续启动前后端。
原始 Python、Word 文件未修改。

## 检查

```bash
npm test
npm run build
```

配置并启动 Neo4j 后可运行真实数据库集成测试：

```bash
npm run test:neo4j
```

测试使用独立临时数据库，覆盖知识库与规则 CRUD、输入校验、知识库隔离、
持久化、统计、关联删除及旧数据库迁移。
`npm run preview` 仅预览构建后的前端；使用 API 时需另行运行后端并配置代理。

## 目录

```text
src/
  components/       概览、知识库、规则、事实、推理和实验记录
  App.vue           页面布局与导航
  api.js            请求封装
  style.css         布局，颜色使用 Element Plus 官方变量
server/
  database.js       SQLite 建表与连接
  app.js            HTTP 接口
  index.js          后端启动入口
  tests/            API 集成测试
  rules/            规则接口与校验
shared/             前后端共用的条件字段与运算符
docs/               操作说明和接口约定
data/               本地运行数据（不纳入版本控制）
```

界面依据 Element Plus 官方设计规范：https://element-plus.org/zh-CN/guide/design.html
