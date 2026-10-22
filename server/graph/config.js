export function graphConfig(env = process.env) {
  const uri = env.NEO4J_URI || 'bolt://127.0.0.1:7687'
  const user = env.NEO4J_USER || 'neo4j'
  const password = env.NEO4J_PASSWORD || ''
  const database = env.NEO4J_DATABASE || 'neo4j'
  const browserUrl = env.NEO4J_BROWSER_URL || 'http://127.0.0.1:7474/browser/'
  const validUri = /^(?:neo4j|bolt)(?:\+s|\+ssc)?:\/\//.test(uri)
  let safeBrowserUrl = ''
  try {
    const parsed = new URL(browserUrl)
    if (['http:', 'https:'].includes(parsed.protocol) && !parsed.username && !parsed.password) {
      safeBrowserUrl = parsed.href
    }
  } catch { /* The optional browser link is omitted for invalid configuration. */ }
  return { uri, user, password, database, browserUrl: safeBrowserUrl, configured: Boolean(password && validUri) }
}
