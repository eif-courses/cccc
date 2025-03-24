<!-- components/PlagiarismReportForm.vue -->
<template>
  <div class="p-4 bg-white shadow rounded-lg">
    <h2 class="text-xl font-bold mb-4">
      Plagiarism Report Generator
    </h2>

    <form
      class="space-y-4"
      @submit.prevent="submitForm"
    >
      <!-- Student Information Section -->
      <fieldset class="border p-4 rounded">
        <legend class="font-medium">
          Student Information
        </legend>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">Student Name</label>
            <input
              v-model="formData.studentName"
              type="text"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
              :disabled="!!student"
            >
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Program Code</label>
            <input
              v-model="formData.programCode"
              type="text"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
              :disabled="!!student"
            >
          </div>

          <div class="md:col-span-2">
            <label class="block text-sm font-medium text-gray-700">Thesis Title</label>
            <input
              v-model="formData.thesisTitle"
              type="text"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
              :disabled="!!student"
            >
          </div>
        </div>
      </fieldset>

      <!-- Plagiarism Results Section -->
      <fieldset class="border p-4 rounded">
        <legend class="font-medium">
          Plagiarism Results
        </legend>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">Total Match Percentage</label>
            <div class="mt-1 flex rounded-md shadow-sm">
              <input
                v-model="formData.totalMatchPercentage"
                type="number"
                min="0"
                max="100"
                step="0.1"
                class="block w-full rounded-none rounded-l-md border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                required
              >
              <span class="inline-flex items-center rounded-r-md border border-l-0 border-gray-300 bg-gray-50 px-3 text-gray-500">%</span>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Single Source Max Match</label>
            <div class="mt-1 flex rounded-md shadow-sm">
              <input
                v-model="formData.singleSourceMaxMatch"
                type="number"
                min="0"
                max="100"
                step="0.1"
                class="block w-full rounded-none rounded-l-md border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                required
              >
              <span class="inline-flex items-center rounded-r-md border border-l-0 border-gray-300 bg-gray-50 px-3 text-gray-500">%</span>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Same Student Work Match</label>
            <div class="mt-1 flex rounded-md shadow-sm">
              <input
                v-model="formData.sameStudentWorkMatch"
                type="number"
                min="0"
                max="100"
                step="0.1"
                class="block w-full rounded-none rounded-l-md border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                required
              >
              <span class="inline-flex items-center rounded-r-md border border-l-0 border-gray-300 bg-gray-50 px-3 text-gray-500">%</span>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Joint Work Match</label>
            <div class="mt-1 flex rounded-md shadow-sm">
              <input
                v-model="formData.jointWorkMatch"
                type="number"
                min="0"
                max="100"
                step="0.1"
                class="block w-full rounded-none rounded-l-md border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                required
              >
              <span class="inline-flex items-center rounded-r-md border border-l-0 border-gray-300 bg-gray-50 px-3 text-gray-500">%</span>
            </div>
          </div>
        </div>
      </fieldset>

      <!-- Advisor Information Section -->
      <fieldset class="border p-4 rounded">
        <legend class="font-medium">
          Advisor Information
        </legend>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">Advisor Name</label>
            <input
              v-model="formData.advisorName"
              type="text"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            >
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Position</label>
            <input
              v-model="formData.advisorPosition"
              type="text"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            >
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Institution</label>
            <input
              v-model="formData.advisorInstitution"
              type="text"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            >
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Date</label>
            <input
              v-model="formData.date"
              type="date"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            >
          </div>
        </div>
      </fieldset>

      <!-- Additional Comments Section -->
      <fieldset class="border p-4 rounded">
        <legend class="font-medium">
          Supervisor Comments
        </legend>
        <div>
          <label class="block text-sm font-medium text-gray-700">Comments</label>
          <textarea
            v-model="formData.supervisorComments"
            rows="4"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
      </fieldset>

      <div class="flex justify-between">
        <div>
          <button
            v-if="existingReportId"
            type="button"
            class="px-4 py-2 bg-red-600 text-white font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            :disabled="isLoading"
            @click="deleteReportConfirm"
          >
            Delete Report
          </button>
        </div>
        <div class="flex space-x-4">
          <button
            type="button"
            class="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            :disabled="isLoading"
            @click="$emit('cancel')"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            :disabled="isLoading"
          >
            {{ submitButtonText }}
          </button>
        </div>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useSupervisorReports } from '~/composables/useSupervisorReports'
import type { StudentRecord } from '~~/types/mytype'

// interface StudentRecord {
//   id: number
//   studentGroup: string
//   finalProjectTitle: string
//   studentEmail: string
//   studentName: string
//   studentLastname: string
//   studentNumber: string
//   supervisorEmail: string
//   studyProgram: string
//   department: string
//   programCode: string
//   currentYear: number
//   reviewerEmail: string
//   reviewerName: string
//   isFavorite: number
// }

// Define props
const props = defineProps({
  student: {
    type: Object as () => StudentRecord | null,
    default: null
  },
  reportId: {
    type: Number,
    default: null
  }
})

// Define emits
const emit = defineEmits(['submit', 'cancel', 'deleted'])

// Set up supervisor reports API
const { createReport, getReportById, updateReport, deleteReport, isLoading: apiLoading } = useSupervisorReports()

const existingReportId = ref(props.reportId)
const isLoading = ref(false)

// Form data
const formData = ref({
  studentName: '',
  programCode: '',
  thesisTitle: '',
  totalMatchPercentage: 0,
  singleSourceMaxMatch: 0,
  sameStudentWorkMatch: 0,
  jointWorkMatch: 0,
  supervisorComments: '',
  advisorName: 'Marius Gžegoževskis',
  advisorPosition: 'Lektorius',
  advisorInstitution: 'Vilniaus kolegija Elektronikos ir informatikos fakultetas',
  date: new Date().toISOString().substr(0, 10)
})

// Compute submit button text based on whether we're creating or updating
const submitButtonText = computed(() => {
  return existingReportId.value ? 'Update Report' : 'Generate Report'
})

// Initialize with student data if provided
watch(() => props.student, (newVal) => {
  if (newVal) {
    formData.value.studentName = `${newVal.studentName} ${newVal.studentLastname}`
    formData.value.programCode = newVal.programCode
    formData.value.thesisTitle = newVal.finalProjectTitle
  }
}, { immediate: true })

// Load existing report if reportId is provided
watch(() => props.reportId, async (newVal) => {
  if (newVal) {
    existingReportId.value = newVal
    const report = await getReportById(newVal)

    if (report) {
      // Map report data to form fields
      formData.value.totalMatchPercentage = report.otherMatch
      formData.value.singleSourceMaxMatch = report.oneMatch
      formData.value.sameStudentWorkMatch = report.ownMatch
      formData.value.jointWorkMatch = report.joinMatch
      formData.value.supervisorComments = report.supervisorComments
    }
  }
}, { immediate: true })

// Submit form handler
const submitForm = async () => {
  isLoading.value = true

  try {
    // Map form data to API format
    const reportData = {
      studentRecordId: props.student?.id,
      supervisorComments: formData.value.supervisorComments,
      otherMatch: formData.value.totalMatchPercentage,
      oneMatch: formData.value.singleSourceMaxMatch,
      ownMatch: formData.value.sameStudentWorkMatch,
      joinMatch: formData.value.jointWorkMatch
    }

    let result

    if (existingReportId.value) {
      // Update existing report
      result = await updateReport(existingReportId.value, {
        supervisorComments: reportData.supervisorComments,
        otherMatch: reportData.otherMatch,
        oneMatch: reportData.oneMatch,
        ownMatch: reportData.ownMatch,
        joinMatch: reportData.joinMatch
      })
    }
    else {
      // Create new report
      result = await createReport(reportData)
      if (result) {
        existingReportId.value = result.id
      }
    }

    if (result) {
      // Success - emit the result
      emit('submit', {
        ...formData.value,
        id: result.id,
        studentRecordId: props.student?.id
      })
    }
  }
  catch (error) {
    console.error('Error submitting report:', error)
  }
  finally {
    isLoading.value = false
  }
}

// Delete report handler
const deleteReportConfirm = async () => {
  if (!existingReportId.value) return

  // Simple confirmation - in a real app, use a modal dialog
  if (!confirm('Are you sure you want to delete this report?')) {
    return
  }

  isLoading.value = true

  try {
    const success = await deleteReport(existingReportId.value)

    if (success) {
      emit('deleted', existingReportId.value)
      existingReportId.value = null
    }
  }
  catch (error) {
    console.error('Error deleting report:', error)
  }
  finally {
    isLoading.value = false
  }
}
</script>
