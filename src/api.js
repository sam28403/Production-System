export async function request(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
    signal: AbortSignal.timeout(10000),
  })
  if (response.status === 204) return null
  const data = await response.json()
  if (!response.ok) throw new Error(data.message || '请求失败，请稍后重试。')
  return data
}
