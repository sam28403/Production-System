import { ref, watch } from 'vue'
import { request } from '../api'

export function useKnowledgeGraph(props) {
  const baseId = ref(null)
  const status = ref(null)
  const graph = ref(null)
  const loading = ref(false)
  const syncing = ref(false)
  const error = ref('')
  const query = ref('')
  const limit = ref(1)
  let generation = 0

  watch(() => props.bases, (bases) => {
    if (!bases.some((base) => base.id === baseId.value)) baseId.value = bases[0]?.id || null
  }, { immediate: true })
  watch([baseId, () => props.revision], () => { graph.value = null; check() }, { immediate: true })

  async function check() {
    const ticket = ++generation
    const base = baseId.value
    if (!base) return
    loading.value = true
    status.value = null
    error.value = ''
    try {
      const result = await request(`/knowledge-bases/${base}/graph/status`)
      if (ticket !== generation) return
      status.value = result
      if (result.connected && result.metadata) await load(ticket)
      else graph.value = null
    } catch (cause) {
      if (ticket === generation) { error.value = cause.message; graph.value = null }
    } finally {
      if (ticket === generation) loading.value = false
    }
  }

  async function load(ticket = ++generation) {
    const base = baseId.value
    if (!base) return
    loading.value = true
    error.value = ''
    try {
      const params = new URLSearchParams({ q: query.value.trim(), limit: String(limit.value) })
      const result = await request(`/knowledge-bases/${base}/graph?${params}`)
      if (ticket === generation) graph.value = result
    } catch (cause) {
      if (ticket === generation) { error.value = cause.message; graph.value = null }
    } finally {
      if (ticket === generation) loading.value = false
    }
  }

  async function sync() {
    if (syncing.value || !baseId.value) return
    const base = baseId.value
    syncing.value = true
    error.value = ''
    try {
      await request(`/knowledge-bases/${base}/graph/sync`, { method: 'POST' })
      if (base === baseId.value) await check()
    } catch (cause) {
      if (base === baseId.value) error.value = cause.message
    } finally {
      syncing.value = false
    }
  }
  return { baseId, status, graph, loading, syncing, error, query, limit, check, load, sync }
}
