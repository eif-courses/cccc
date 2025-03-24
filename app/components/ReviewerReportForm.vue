<!-- components/ReviewerReportForm.vue -->
<template>
  <div class="p-4 bg-white shadow rounded-lg">
    <h2 class="text-xl font-bold mb-4">
      Reviewer Report Form
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

      <!-- Grade Section -->
      <fieldset class="border p-4 rounded">
        <legend class="font-medium">
          Evaluation
        </legend>
        <div class="grid grid-cols-1 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">Grade (0-10)</label>
            <div class="mt-1 flex rounded-md shadow-sm">
              <input
                v-model="formData.grade"
                type="number"
                min="0"
                max="10"
                step="0.1"
                class="block w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                required
              >
            </div>
          </div>
        </div>
      </fieldset>

      <!-- Reviewer Information Section -->
      <fieldset class="border p-4 rounded">
        <legend class="font-medium">
          Reviewer Information
        </legend>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">Reviewer Name</label>
            <input
              v-model="formData.reviewerPersonalInfo.name"
              type="text"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            >
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Position</label>
            <input
              v-model="formData.reviewerPersonalInfo.position"
              type="text"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            >
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Workplace</label>
            <input
              v-model="formData.reviewerPersonalInfo.workplace"
              type="text"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            >
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Academic Title/Degree</label>
            <input
              v-model="formData.reviewerPersonalInfo.academicTitle"
              type="text"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
          </div>
        </div>
      </fieldset>

      <!-- Review Sections -->
      <fieldset class="border p-4 rounded">
        <legend class="font-medium">
          Thesis Evaluation
        </legend>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">Purpose and Objectives</label>
            <textarea
              v-model="formData.reviewFields.purposeAndObjectives"
              rows="3"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Theoretical Part Evaluation</label>
            <textarea
              v-model="formData.reviewFields.theoreticalPartEvaluation"
              rows="3"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Research/Project Part Evaluation</label>
            <textarea
              v-model="formData.reviewFields.researchPartEvaluation"
              rows="3"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Connection Between Theory and Research</label>
            <textarea
              v-model="formData.reviewFields.theoryResearchConnection"
              rows="3"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Results and Conclusions</label>
            <textarea
              v-model="formData.reviewFields.resultsAndConclusions"
              rows="3"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Practical Significance</label>
            <textarea
              v-model="formData.reviewFields.practicalSignificance"
              rows="3"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Language Correctness</label>
            <textarea
              v-model="formData.reviewFields.languageCorrectness"
              rows="3"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Thesis Strengths</label>
            <textarea
              v-model="formData.reviewFields.thesisStrengths"
              rows="3"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Thesis Weaknesses</label>
            <textarea
              v-model="formData.reviewFields.thesisWeaknesses"
              rows="3"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Questions for Author</label>
            <textarea
              v-model="formData.reviewFields.questionsForAuthor"
              rows="3"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>
      </fieldset>

      <!-- Signature Section -->
      <fieldset class="border p-4 rounded">
        <legend class="font-medium">
          Signature
        </legend>
        <div class="flex items-center">
          <input
            v-model="formData.isSigned"
            type="checkbox"
            class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          >
          <label class="ml-2 block text-sm text-gray-700">
            I confirm this review is complete and ready for submission
          </label>
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
import { useReviewerReports } from '~/composables/useReviewerReports'
import type { StudentRecord } from '~~/types/mytype'

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

// Set up reviewer reports API
const { createReport, getReportById, updateReport, deleteReport, isLoading: apiLoading } = useReviewerReports()

const existingReportId = ref(props.reportId)
const isLoading = ref(false)

// Form data with nested objects for JSON fields
const formData = ref({
  studentName: '',
  programCode: '',
  thesisTitle: '',
  grade: 0,
  isSigned: false,
  reviewerPersonalInfo: {
    name: '',
    position: '',
    workplace: 'Vilniaus kolegija',
    academicTitle: ''
  },
  reviewFields: {
    purposeAndObjectives: '',
    theoreticalPartEvaluation: '',
    researchPartEvaluation: '',
    theoryResearchConnection: '',
    resultsAndConclusions: '',
    practicalSignificance: '',
    languageCorrectness: '',
    thesisStrengths: '',
    thesisWeaknesses: '',
    questionsForAuthor: ''
  }
})

// Compute submit button text based on whether we're creating or updating
const submitButtonText = computed(() => {
  return existingReportId.value ? 'Update Report' : 'Submit Review'
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
    isLoading.value = true

    try {
      const report = await getReportById(newVal)

      if (report) {
        // Map report data to form fields
        formData.value.grade = report.grade
        formData.value.isSigned = report.isSigned === 1

        // Parse JSON fields if they exist
        if (report.reviewerPersonalInfo) {
          try {
            const personalInfo = typeof report.reviewerPersonalInfo === 'string'
              ? JSON.parse(report.reviewerPersonalInfo)
              : report.reviewerPersonalInfo

            formData.value.reviewerPersonalInfo = {
              ...formData.value.reviewerPersonalInfo,
              ...personalInfo
            }
          }
          catch (e) {
            console.error('Error parsing reviewer personal info:', e)
          }
        }

        if (report.reviewFields) {
          try {
            const fields = typeof report.reviewFields === 'string'
              ? JSON.parse(report.reviewFields)
              : report.reviewFields

            formData.value.reviewFields = {
              ...formData.value.reviewFields,
              ...fields
            }
          }
          catch (e) {
            console.error('Error parsing review fields:', e)
          }
        }
      }
    }
    catch (error) {
      console.error('Error loading report:', error)
    }
    finally {
      isLoading.value = false
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
      grade: formData.value.grade,
      reviewerPersonalInfo: formData.value.reviewerPersonalInfo,
      reviewFields: formData.value.reviewFields,
      isSigned: formData.value.isSigned
    }

    let result

    if (existingReportId.value) {
      // Update existing report
      result = await updateReport(existingReportId.value, reportData)
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
