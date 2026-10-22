import { ref, watch } from 'vue'
import { request } from '../api'

export function useBaseRecords(props, resource) {
  const baseId = ref(null)
  const rows = ref([])
  const loading = ref(false)
  const error = ref('')
  let generation = 0
  watch(() => props.bases, (bases) => {
    if (!bases.some((base) => base.id === baseId.value)) baseId.value = bases[0]?.id || null
  }, { immediate: true })
  watch([baseId, () => props.revision], reload, { immediate: true })

  async function reload() {
    const current = ++generation
    rows.value = []
    error.value = ''
    loading.value = Boolean(baseId.value)
    if (!baseId.value) return
    try {
      const data = await request(`/knowledge-bases/${baseId.value}/${resource}`)
      if (current === generation) rows.value = data
    } catch (cause) {
      if (current === generation) error.value = cause.message
    } finally {
      if (current === generation) loading.value = false
    }
  }
  return { baseId, rows, loading, error, reload }
}
