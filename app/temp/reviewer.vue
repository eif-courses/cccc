<template>
  <div>
    <UModal
      v-model="isOpen"
      prevent-close
    >
      <UCard
        :ui="{ ring: '', divide: 'divide-y divide-gray-100 dark:divide-gray-800' }"
        class="w-full max-w-6xl"
      >
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
              {{ studentObject?.studentGroup }}, {{ studentObject?.studentName }} ({{ studentObject?.currentYear }})
              pristatomasis vaizdo įrašas
            </h3>
            <UButton
              color="gray"
              variant="ghost"
              icon="i-heroicons-x-mark-20-solid"
              class="ml-4"
              @click="isOpen = false"
            />
          </div>
        </template>

        <div class="p-4">
          <div class="flex justify-center">
            <iframe
              :src="`https://customer-lgoylb8hch1to7bf.cloudflarestream.com/${videoObject?.uid}/iframe`"
              style="border: none; width: 800px; height: 450px;"
              allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
              allowfullscreen="true"
            />
          </div>
        </div>
      </UCard>
    </UModal>

    <div v-if="queryLoading">
      Loading...
    </div>
    <div v-else-if="fetchError">
      {{ fetchError.message }}
    </div>
    <UTable
      v-else
      :columns="columns"
      :rows="records.students"
    >
      <template #id-data="{ row }">
        {{ row.student.id }}
      </template>

      <template #studentName-data="{ row }">
        {{ row.student.studentName }}
      </template>

      <template #actions-data="{ row }">
        <div class="flex gap-2">
          <UButton
            v-if="row.videos[0]"
            icon="i-heroicons-video-camera"
            size="sm"
            color="white"
            variant="solid"
            label="Vaizdo įrašas"
            :trailing="false"
            @click="sendStudentData(row.videos[0], row.student)"
          />

          <template
            v-for="doc in row.documents"
            :key="doc.id"
          >
            <template v-if="doc.documentType === 'PDF'">
              <UButton
                :loading="isFetchingDocument"
                icon="i-heroicons-document-text"
                size="sm"
                color="white"
                variant="solid"
                label="Aprašas"
                :trailing="false"
                @click="openDocument(doc)"
              />
            </template>
            <template v-else-if="doc.documentType === 'ZIP'">
              <UButton
                :loading="isFetchingDocument"
                icon="i-heroicons-code-bracket-square"
                size="sm"
                color="white"
                variant="solid"
                label="Kodas"
                :trailing="false"
                @click="openDocument(doc)"
              />
            </template>
          </template>

          <template v-if="row.reviewerReports && row.reviewerReports.length > 0">
            <template
              v-for="report in row.reviewerReports"
              :key="report.id"
            >
              Report: {{ report }}
            </template>
          </template>
          <template v-else>
            <UButton
              icon="i-heroicons-plus-circle"
              size="sm"
              color="primary"
              variant="solid"
              label="Pateikite recenziją"
              :trailing="false"
            />
          </template>
        </div>
      </template>
    </UTable>
  </div>

<!--  <UButton -->
<!--    icon="i-heroicons-pencil-square" -->
<!--    size="sm" -->
<!--    color="white" -->
<!--    variant="solid" -->
<!--    label="Pildyti recenziją" -->
<!--    :trailing="false" -->
<!--    @click="openReportForm(row)" -->
<!--  /> -->

<!--  <ReportForm -->
<!--    v-if="selectedStudent" -->
<!--    :student="selectedStudent" -->
<!--    :is-open="isModalOpen" -->
<!--    @close="closeReportForm" -->
<!--    @save="handleSave" -->
<!--  /> -->
</template>

<script setup lang="ts">
// import ReportForm from '~/components/ReportForm.vue'

const isOpen = ref(false)
const videoObject = ref<Video | null>(null)
const studentObject = ref<StudentRecord | null>(null)
const isFetchingDocument = ref(false)
const columns = [
  { key: 'id', label: 'ID' },
  { key: 'studentName', label: 'User name' },
  { key: 'actions', label: 'Actions' }
]

const sendStudentData = (mVideo: Video, mStudent: StudentRecord) => {
  isOpen.value = true
  videoObject.value = mVideo
  studentObject.value = mStudent
}

async function getFile(fileName) {
  try {
    const response = await $fetch(`/api/blob/get/${fileName}`)
    if (response?.url) {
      return response.url // Return the temporary access URL
    }
    else {
      throw new Error('Invalid response from server')
    }
  }
  catch (error) {
    console.error('Error fetching file URL:', error)
    return ''
  }
}

const openDocument = async (doc: Document) => {
  isFetchingDocument.value = true

  const fileUrl = await getFile(doc.filePath)

  isFetchingDocument.value = false

  if (fileUrl) {
    if (doc.documentType === 'PDF') {
      window.open(fileUrl, '_blank')
    }
    else if (doc.documentType === 'ZIP') {
      const link = document.createElement('a')
      link.href = fileUrl
      link.download = doc.filePath.split('/').pop() || 'download.zip'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }
}
interface StudentRecord {
  id: number
  studentGroup: string
  studentEmail: string
  studentName: string
  studentLastname: string
  studentNumber: string
  supervisorEmail: string
  studyProgram: string
  currentYear: number
  reviewerEmail: string
  reviewerName: string
}

// Define the structure of documents, videos, supervisor reports, and reviewer reports
interface Document {
  id: number
  documentType: string
  filePath: string
  uploadedDate: number // This can be a timestamp
  studentRecordId: number // Foreign key reference
}

interface Video {
  id: number
  studentRecordId: number // Foreign key reference
  uid: string
  thumbnail?: string
  preview?: string
  hlsUrl?: string
  dashUrl?: string
  createdAt: number // This can be a timestamp
}

interface SupervisorReport {
  id: number
  studentRecordId: number // Foreign key reference
  supervisorComments: string
  grade: number
  feedback?: string
  createdDate: number // This can be a timestamp
}

interface ReviewerReport {
  id: number
  studentRecordId: number // Foreign key reference
  reviewerComments: string
  assessment?: string
  recommendations?: string
  createdDate: number // This can be a timestamp
}

// Define the structure of the complete API response
interface StudentRecordsResponse {
  studentRecord: StudentRecord
  documents: Document[]
  videos: Video[]
  supervisorReports: SupervisorReport[]
  reviewerReports: ReviewerReport[]
}

// const authStore = useAuthStore()
const year = 2025

// const { data: records, error: fetchError, isLoading: queryLoading } = useQuery<StudentRecord[]>({
//   key: ['records'],
//   query: async () => {
//     const data = await useRequestFetch()(`/api/students/reviewer?year=${year}`)
//     return data.records || []
//   }
// })

const { data: records, error: fetchError, isLoading: queryLoading } = useQuery<StudentRecordsResponse>({
  key: ['records', year], // Key should include the year for better caching
  query: async () => {
    const data = await useRequestFetch()(`/api/students/reviewer?year=${year}`)
    return data
  }
})

// onMounted(() => {
//   const displayName = authStore.user?.displayName
//   if (!displayName) throw new Error('User not authenticated')
//   useCookie('displayName').value = displayName
// })
</script>

<style scoped>

</style>
