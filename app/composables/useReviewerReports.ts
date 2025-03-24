// composables/useReviewerReports.ts
import { ref } from 'vue'

export const useReviewerReports = (baseUrl = '/api/students/reviewer-reports') => {
  const isLoading = ref(false)
  const error = ref(null)

  /**
     * Create a new reviewer report
     */
  const createReport = async (reportData) => {
    isLoading.value = true
    error.value = null

    try {
      const response = await $fetch(baseUrl, {
        method: 'POST',
        body: reportData
      })

      if (!response.success) {
        throw new Error(response.message || 'Failed to create reviewer report')
      }

      return response.data
    }
    catch (err) {
      console.error('Error creating reviewer report:', err)
      error.value = err
      return null
    }
    finally {
      isLoading.value = false
    }
  }

  /**
     * Get a reviewer report by ID
     */
  const getReportById = async (id) => {
    isLoading.value = true
    error.value = null

    try {
      const response = await $fetch(`${baseUrl}/${id}`, {
        method: 'GET'
      })

      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch reviewer report')
      }

      return response.data
    }
    catch (err) {
      console.error(`Error fetching reviewer report ${id}:`, err)
      error.value = err
      return null
    }
    finally {
      isLoading.value = false
    }
  }

  /**
     * Update an existing reviewer report
     */
  const updateReport = async (id, updateData) => {
    isLoading.value = true
    error.value = null

    try {
      const response = await $fetch(`${baseUrl}/${id}`, {
        method: 'PUT',
        body: updateData
      })

      if (!response.success) {
        throw new Error(response.message || 'Failed to update reviewer report')
      }

      return response.data
    }
    catch (err) {
      console.error(`Error updating reviewer report ${id}:`, err)
      error.value = err
      return null
    }
    finally {
      isLoading.value = false
    }
  }

  /**
     * Delete a reviewer report
     */
  const deleteReport = async (id) => {
    isLoading.value = true
    error.value = null

    try {
      const response = await $fetch(`${baseUrl}/${id}`, {
        method: 'DELETE'
      })

      if (!response.success) {
        throw new Error(response.message || 'Failed to delete reviewer report')
      }

      return true
    }
    catch (err) {
      console.error(`Error deleting reviewer report ${id}:`, err)
      error.value = err
      return false
    }
    finally {
      isLoading.value = false
    }
  }

  /**
     * Get all reviewer reports for a student
     */
  const getReportsByStudentId = async (studentId) => {
    isLoading.value = true
    error.value = null

    try {
      const response = await $fetch(baseUrl, {
        method: 'GET',
        params: {
          studentRecordId: studentId
        }
      })

      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch reviewer reports')
      }

      return response.data
    }
    catch (err) {
      console.error(`Error fetching reviewer reports for student ${studentId}:`, err)
      error.value = err
      return []
    }
    finally {
      isLoading.value = false
    }
  }

  return {
    isLoading,
    error,
    createReport,
    getReportById,
    updateReport,
    deleteReport,
    getReportsByStudentId
  }
}
