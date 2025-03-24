<template>
  <div>
    <div v-if="queryLoading">
      Loading...
    </div>
    <div v-else-if="fetchError">
      {{ fetchError.message }}
    </div>
    <UTable
      v-else
      :columns="columns"
      :rows="records"
    >
      <template #actions-data="{ row }">
        <div class="flex gap-2">
          <UButton
            icon="i-heroicons-video-camera"
            size="sm"
            color="white"
            variant="solid"
            label="Vaizdo įrašas"
            :trailing="false"
            @click="openReportForm(row)"
          />
          <UButton
            icon="i-heroicons-document-text"
            size="sm"
            color="white"
            variant="solid"
            label="Aprašas"
            :trailing="false"
            @click="openReportForm(row)"
          />

          <UButton
            icon="i-heroicons-code-bracket-square"
            size="sm"
            color="white"
            variant="solid"
            label="Kodas"
            :trailing="false"
            @click="openReportForm(row)"
          />

          <UButton
            icon="i-heroicons-pencil-square"
            size="sm"
            color="white"
            variant="solid"
            label="Pildyti atsiliepimą"
            :trailing="false"
            @click="openReportForm(row)"
          />
        </div>
      </template>
    </UTable>

    <ReportForm
      v-if="selectedStudent"
      :student="selectedStudent"
      :is-open="isModalOpen"
      @close="closeReportForm"
      @save="handleSave"
    />
  </div>
</template>

<script setup lang="ts">
import ReportForm from '~/components/ReportForm.vue'

definePageMeta({
  middleware: 'auth'
})
const columns = [
  { key: 'id', label: 'ID' },
  { key: 'studentName', label: 'User name' },
  { key: 'actions', label: 'Actions' },
  { key: 'status', label: 'Status' }
]

const selectedStudent = ref(null)
const isModalOpen = ref(false)

const openReportForm = (student) => {
  selectedStudent.value = student
  isModalOpen.value = true
}

const closeReportForm = () => {
  selectedStudent.value = null
  isModalOpen.value = false
}

const handleSave = async ({ studentId, content }) => {
  // Logic to save the report (e.g., make an API call)
  console.log(`Saving report for student ID: ${studentId} with content: ${content}`)
  // After saving, you might want to close the modal or perform other actions
}

interface StudentRecord {
  id: number
  group: string
  studentName: string
  supervisorName: string
  studyProgram: string
  currentYear: number
  reviewerEmail: string
}

const authStore = useAuthStore()

const { data: records, error: fetchError, isLoading: queryLoading } = useQuery<StudentRecord[]>({
  key: ['records'],
  query: async () => {
    const data = await useRequestFetch()('/api/students/all')
    return data.records || []
  }
})

onMounted(() => {
  const displayName = authStore.user?.displayName
  if (!displayName) throw new Error('User not authenticated')
  useCookie('displayName').value = displayName
})
</script>
