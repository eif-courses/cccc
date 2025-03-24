export function useAcademicYears() {
  const years = ref([])
  const isLoading = ref(false)
  const error = ref(null)

  const fetchYears = async () => {
    isLoading.value = true
    error.value = null

    try {
      const { years: fetchedYears } = await $fetch('/api/students/years')
      years.value = fetchedYears
    }
    catch (err) {
      console.error('Error fetching academic years:', err)
      error.value = err.message || 'Failed to load academic years'
    }
    finally {
      isLoading.value = false
    }
  }

  // Optional: Fetch immediately when the composable is used
  onMounted(async () => {
    await fetchYears()
  })

  return {
    years,
    isLoading,
    error,
    fetchYears
  }
}
