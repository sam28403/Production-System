import { graphConfig } from '../../server/graph/config.js'
import { createGraphStore } from '../../server/graph/store.js'
import { projectKnowledgeBase } from '../../server/graph/projection.js'
import { openDatabase } from '../../server/database.js'

const index = process.argv.indexOf('--base-id')
const baseId = index < 0 ? null : Number(process.argv[index + 1])
if (!Number.isSafeInteger(baseId) || baseId < 1) throw new Error('Use --base-id <id>')
const config = graphConfig()
if (!config.configured) throw new Error('Neo4j 尚未配置，请填写 .env.local。')
const db = openDatabase()
const store = createGraphStore(config)
try {
  if (!db.prepare('SELECT id FROM knowledge_bases WHERE id = ?').get(baseId)) {
    throw new Error('知识库不存在。')
  }
  const metadata = await store.sync(baseId, projectKnowledgeBase(db, baseId))
  console.log(JSON.stringify(metadata, null, 2))
} catch {
  console.error('图谱同步失败，请检查目标知识库和 Neo4j 连接及写入权限。')
  process.exitCode = 1
} finally {
  await store.close()
  db.close()
}
