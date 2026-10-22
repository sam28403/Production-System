import { graphConfig } from '../../server/graph/config.js'
import { createGraphStore } from '../../server/graph/store.js'

const config = graphConfig()
if (!config.configured) {
  console.error('Neo4j 尚未配置，请填写 .env.local。')
  process.exitCode = 1
} else {
  const store = createGraphStore(config)
  try {
    await store.status(0)
    console.log('Neo4j 连接成功。')
  } catch {
    console.error('Neo4j 连接失败，请检查数据库服务、连接地址、用户名和密码。')
    process.exitCode = 1
  } finally {
    await store.close()
  }
}
