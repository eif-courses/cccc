// composables/useSupervisorReports.ts
import { ref, computed } from 'vue'
import type { CreateSupervisorReportPayload, SupervisorReport, UpdateSupervisorReportPayload } from '~~/server/utils/db'

// export interface SupervisorReport {
//   id: number
//   studentRecordId: number
//   supervisorComments: string
//   otherMatch: number
//   oneMatch: number
//   ownMatch: number
//   joinMatch: number
//   createdDate: number
// }

// export interface CreateSupervisorReportPayload {
//   studentRecordId: number
//   supervisorComments?: string
//   otherMatch?: number
//   oneMatch?: number
//   ownMatch?: number
//   joinMatch?: number
// }
//
// export interface UpdateSupervisorReportPayload {
//   supervisorComments?: string
//   otherMatch?: number
//   oneMatch?: number
//   ownMatch?: number
//   joinMatch?: number
// }

export const useSupervisorReports = () => {
  const reports = ref<SupervisorReport[]>([])
  const currentReport = ref<SupervisorReport | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Update the API endpoint base URL
  const API_BASE_URL = '/api/students/supervisor-reports'

  // Get all reports or filter by student ID
  const getReports = async (studentRecordId?: number) => {
    isLoading.value = true
    error.value = null

    try {
      const query = studentRecordId ? `?studentRecordId=${studentRecordId}` : ''
      const { data } = await useFetch(`${API_BASE_URL}${query}`)

      if (data.value && data.value.success) {
        reports.value = data.value.data
      }
      else {
        error.value = 'Failed to fetch reports'
      }
    }
    catch (err) {
      console.error('Error fetching supervisor reports:', err)
      error.value = err.message || 'An error occurred while fetching reports'
    }
    finally {
      isLoading.value = false
    }
  }

  // Get single report by ID
  const getReportById = async (id: number) => {
    isLoading.value = true
    error.value = null

    try {
      const { data } = await useFetch(`${API_BASE_URL}/${id}`)

      if (data.value && data.value.success) {
        currentReport.value = data.value.data
        return data.value.data
      }
      else {
        error.value = 'Failed to fetch report'
        return null
      }
    }
    catch (err) {
      console.error(`Error fetching supervisor report with ID ${id}:`, err)
      error.value = err.message || 'An error occurred while fetching the report'
      return null
    }
    finally {
      isLoading.value = false
    }
  }

  // Create a new report
  const createReport = async (payload: CreateSupervisorReportPayload) => {
    isLoading.value = true
    error.value = null

    console.log(payload)

    try {
      const { data } = await useFetch(API_BASE_URL, {
        method: 'POST',
        body: payload
      })

      if (data.value && data.value.success) {
        // Add to reports list if we have it loaded
        if (reports.value.length > 0) {
          reports.value.push(data.value.data)
        }
        return data.value.data
      }
      else {
        error.value = 'Failed to create report'
        return null
      }
    }
    catch (err) {
      console.error('Error creating supervisor report:', err)
      error.value = err.message || 'An error occurred while creating the report'
      return null
    }
    finally {
      isLoading.value = false
    }
  }

  // Update an existing report
  const updateReport = async (id: number, payload: UpdateSupervisorReportPayload) => {
    isLoading.value = true
    error.value = null

    try {
      const { data } = await useFetch(`${API_BASE_URL}/${id}`, {
        method: 'PUT',
        body: payload
      })

      if (data.value && data.value.success) {
        // Update in reports list if we have it loaded
        const index = reports.value.findIndex(r => r.id === id)
        if (index !== -1) {
          reports.value[index] = data.value.data
        }

        // Update current report if it's the one we're viewing
        if (currentReport.value && currentReport.value.id === id) {
          currentReport.value = data.value.data
        }

        return data.value.data
      }
      else {
        error.value = 'Failed to update report'
        return null
      }
    }
    catch (err) {
      console.error(`Error updating supervisor report with ID ${id}:`, err)
      error.value = err.message || 'An error occurred while updating the report'
      return null
    }
    finally {
      isLoading.value = false
    }
  }

  // Delete a report
  const deleteReport = async (id: number) => {
    isLoading.value = true
    error.value = null

    try {
      const { data } = await useFetch(`${API_BASE_URL}/${id}`, {
        method: 'DELETE'
      })

      if (data.value && data.value.success) {
        // Remove from reports list if we have it loaded
        reports.value = reports.value.filter(r => r.id !== id)

        // Clear current report if it's the one we deleted
        if (currentReport.value && currentReport.value.id === id) {
          currentReport.value = null
        }

        return true
      }
      else {
        error.value = 'Failed to delete report'
        return false
      }
    }
    catch (err) {
      console.error(`Error deleting supervisor report with ID ${id}:`, err)
      error.value = err.message || 'An error occurred while deleting the report'
      return false
    }
    finally {
      isLoading.value = false
    }
  }

  // Get reports for a specific student
  const getReportsByStudent = (studentId: number) => {
    return computed(() => {
      return reports.value.filter(report => report.studentRecordId === studentId)
    })
  }

  return {
    reports,
    currentReport,
    isLoading,
    error,
    getReports,
    getReportById,
    createReport,
    updateReport,
    deleteReport,
    getReportsByStudent
  }
}
