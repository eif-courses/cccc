<script lang="ts" setup>
import PlagiarismReportForm from '~/components/PlagiarismReportForm.vue'
import type { StudentRecord } from '~~/server/utils/db'

definePageMeta({
  middleware: ['teacher-access']
})

const statusMessage = ref('')
const statusError = ref(false)
const isLoading = ref(false)

// Constants for formatting
const DEFAULT_FONT_SIZE = 12
const DEFAULT_FONT_NAME = 'Times New Roman'

// Helper function to create dotted line text
const createDottedLine = (length = 70) => {
  return '.'.repeat(length)
}

const generateReport = async (formData) => {
  try {
    isLoading.value = true
    statusMessage.value = ''
    statusError.value = false

    // Import the required modules from docx
    const docx = await import('docx')
    const {
      Document,
      Paragraph,
      TextRun,
      AlignmentType,
      HeadingLevel,
      TabStopPosition,
      TabStopType
    } = docx

    // Import saveAs from file-saver
    const { saveAs } = await import('file-saver')

    // Function to create a dotted line paragraph with formatting options
    const createDottedLineParagraph = (
      text = '',
      preText = '',
      postText = '',
      alignment = AlignmentType.LEFT,
      isBold = false,
      fontSize = DEFAULT_FONT_SIZE
    ) => {
      const children = []

      if (preText) {
        children.push(new TextRun({
          text: preText,
          bold: isBold,
          size: fontSize * 2,
          font: DEFAULT_FONT_NAME
        }))
      }

      if (text) {
        children.push(new TextRun({
          text,
          bold: isBold,
          size: fontSize * 2,
          font: DEFAULT_FONT_NAME
        }))
      }
      else {
        children.push(new TextRun({
          text: createDottedLine(),
          bold: isBold,
          size: fontSize * 2,
          font: DEFAULT_FONT_NAME
        }))
      }

      if (postText) {
        children.push(new TextRun({
          text: postText,
          bold: isBold,
          size: fontSize * 2,
          font: DEFAULT_FONT_NAME
        }))
      }

      return new Paragraph({
        children,
        alignment
      })
    }

    // Helper function to create standard paragraph
    const createStandardParagraph = (text, alignment = AlignmentType.LEFT, isBold = false, fontSize = DEFAULT_FONT_SIZE) => {
      return new Paragraph({
        children: [
          new TextRun({
            text,
            bold: isBold,
            size: fontSize * 2, // Size in half-points
            font: DEFAULT_FONT_NAME
          })
        ],
        alignment
      })
    }

    // Create a new document
    const doc = new Document({
      styles: {
        default: {
          document: {
            run: {
              font: DEFAULT_FONT_NAME,
              size: DEFAULT_FONT_SIZE * 2 // Size in half-points
            }
          }
        }
      },
      sections: [
        {
          properties: {},
          children: [
            // Header
            createStandardParagraph(
              'Vilniaus kolegijos baigiamųjų darbų (projektų)',
              AlignmentType.LEFT,
              false
            ),
            createStandardParagraph(
              'rengimo ir gynimo tvarkos aprašo',
              AlignmentType.RIGHT,
              false
            ),
            createStandardParagraph(
              '4 priedas',
              AlignmentType.RIGHT,
              false
            ),
            new Paragraph({}),

            // Title section
            createStandardParagraph(
              'VILNIAUS KOLEGIJOS',
              AlignmentType.CENTER,
              true
            ),

            // Faculty with dotted line - bold
            createDottedLineParagraph(
              formData.faculty || 'ELEKTRONIKOS IR INFORMATIKOS FAKULTETAS',
              '',
              '',
              AlignmentType.CENTER,
              true
            ),

            // Department with dotted line - bold
            createDottedLineParagraph(
              formData.department || 'PROGRAMINĖS ĮRANGOS KATEDRA',
              '',
              '',
              AlignmentType.CENTER,
              true
            ),
            new Paragraph({}),

            // Title - bold
            createStandardParagraph(
              'BAIGIAMOJO DARBO VADOVO ATSILIEPIMAS',
              AlignmentType.CENTER,
              true
            ),
            new Paragraph({}),

            // Study program
            new Paragraph({
              children: [
                new TextRun({
                  text: 'Studijų programa: „',
                  size: DEFAULT_FONT_SIZE * 2,
                  font: DEFAULT_FONT_NAME
                }),
                new TextRun({
                  text: formData.studyProgram || createDottedLine(40),
                  size: DEFAULT_FONT_SIZE * 2,
                  font: DEFAULT_FONT_NAME
                }),
                new TextRun({
                  text: '", valstybinis kodas ',
                  size: DEFAULT_FONT_SIZE * 2,
                  font: DEFAULT_FONT_NAME
                }),
                new TextRun({
                  text: formData.studyCode || createDottedLine(20),
                  size: DEFAULT_FONT_SIZE * 2,
                  font: DEFAULT_FONT_NAME
                })
              ]
            }),
            new Paragraph({}),

            // Student name
            createDottedLineParagraph(
              formData.studentName || '',
              'Studentas (-ė) '
            ),

            createStandardParagraph('(vardas, pavardė)', AlignmentType.CENTER),

            // Thesis title
            createDottedLineParagraph(
              formData.thesisTitle || '',
              'Baigiamojo darbo tema '
            ),

            // Extra line for long thesis titles
            createDottedLineParagraph(),

            // Independence assessment
            createStandardParagraph('Baigiamojo darbo autoriaus savarankiškumas, iniciatyva, darbo rengimo nuoseklumas'),

            // Explanation text or dotted lines
            createDottedLineParagraph(formData.explanationText || ''),
            createDottedLineParagraph(''),
            createDottedLineParagraph(''),

            // Suitability statement
            createStandardParagraph(
              formData.isSuitable !== false
                ? 'Baigiamasis darbas tinkamas ginti Baigiamųjų darbų gynimo komisijos posėdyje.'
                : 'Baigiamasis darbas netinkamas ginti Baigiamųjų darbų gynimo komisijos posėdyje dėl plagiato fakto nustatymo.'
            ),

            // Plagiarism percentage
            new Paragraph({
              children: [
                new TextRun({
                  text: 'Nustatyta sutaptis su kitais darbais sudaro ',
                  size: DEFAULT_FONT_SIZE * 2,
                  font: DEFAULT_FONT_NAME
                }),
                new TextRun({
                  text: formData.otherMatch || '...',
                  size: DEFAULT_FONT_SIZE * 2,
                  font: DEFAULT_FONT_NAME
                }),
                new TextRun({
                  text: ' procentų viso darbo, iš jų:',
                  size: DEFAULT_FONT_SIZE * 2,
                  font: DEFAULT_FONT_NAME
                })
              ]
            }),

            // Single source match
            new Paragraph({
              children: [
                new TextRun({
                  text: 'sutaptis su vienu šaltiniu -- ',
                  size: DEFAULT_FONT_SIZE * 2,
                  font: DEFAULT_FONT_NAME
                }),
                new TextRun({
                  text: formData.singleSourceMatch || '...',
                  size: DEFAULT_FONT_SIZE * 2,
                  font: DEFAULT_FONT_NAME
                }),
                new TextRun({
                  text: ' procentų viso darbo;',
                  size: DEFAULT_FONT_SIZE * 2,
                  font: DEFAULT_FONT_NAME
                })
              ]
            }),

            // Same student match
            new Paragraph({
              children: [
                new TextRun({
                  text: 'sutaptis su kitais to paties studento studijų rašto darbais sudaro ',
                  size: DEFAULT_FONT_SIZE * 2,
                  font: DEFAULT_FONT_NAME
                }),
                new TextRun({
                  text: formData.sameStudentMatch || '...',
                  size: DEFAULT_FONT_SIZE * 2,
                  font: DEFAULT_FONT_NAME
                }),
                new TextRun({
                  text: ' procentų viso darbo;',
                  size: DEFAULT_FONT_SIZE * 2,
                  font: DEFAULT_FONT_NAME
                })
              ]
            }),

            // Joint match
            new Paragraph({
              children: [
                new TextRun({
                  text: 'sutaptis su kitų studentų to paties jungtinio darbo autorių darbais sudaro ',
                  size: DEFAULT_FONT_SIZE * 2,
                  font: DEFAULT_FONT_NAME
                }),
                new TextRun({
                  text: formData.jointMatch || '...',
                  size: DEFAULT_FONT_SIZE * 2,
                  font: DEFAULT_FONT_NAME
                }),
                new TextRun({
                  text: ' procentų viso darbo.',
                  size: DEFAULT_FONT_SIZE * 2,
                  font: DEFAULT_FONT_NAME
                })
              ]
            }),

            new Paragraph({}),

            // Signature section
            createStandardParagraph('Baigiamojo darbo'),

            new Paragraph({
              children: [
                new TextRun({
                  text: 'vadovas ',
                  size: DEFAULT_FONT_SIZE * 2,
                  font: DEFAULT_FONT_NAME
                }),
                new TextRun({
                  text: createDottedLine(10),
                  size: DEFAULT_FONT_SIZE * 2,
                  font: DEFAULT_FONT_NAME
                }),
                new TextRun({
                  text: ' ',
                  size: DEFAULT_FONT_SIZE * 2,
                  font: DEFAULT_FONT_NAME
                }),
                new TextRun({
                  text: formData.supervisorName || createDottedLine(30),
                  size: DEFAULT_FONT_SIZE * 2,
                  font: DEFAULT_FONT_NAME
                })
              ]
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: '                     ',
                  size: DEFAULT_FONT_SIZE * 2,
                  font: DEFAULT_FONT_NAME
                }),
                new TextRun({
                  text: '(parašas)',
                  size: DEFAULT_FONT_SIZE * 2,
                  font: DEFAULT_FONT_NAME
                }),
                new TextRun({
                  text: '                 ',
                  size: DEFAULT_FONT_SIZE * 2,
                  font: DEFAULT_FONT_NAME
                }),
                new TextRun({
                  text: '(vardas, pavardė)',
                  size: DEFAULT_FONT_SIZE * 2,
                  font: DEFAULT_FONT_NAME
                })
              ]
            }),

            new Paragraph({}),

            // Workplace
            createDottedLineParagraph(formData.workplace || 'Vilniaus kolegija Elektronikos ir informatikos fakultetas'),
            createStandardParagraph('(darbovietė)', AlignmentType.CENTER),

            // Position
            createDottedLineParagraph(formData.supervisorPosition || 'Lektorius'),
            createStandardParagraph('(pareigos)', AlignmentType.CENTER),

            // Date
            createDottedLineParagraph(formData.dateField || new Date().toISOString().split('T')[0], '', '', AlignmentType.CENTER),
            createStandardParagraph('(data)', AlignmentType.CENTER)
          ]
        }
      ]
    })

    // Generate and save document
    const blob = await docx.Packer.toBlob(doc)
    saveAs(blob, `${formData.studentName || 'Report'}_vadovo_atsiliepimas.docx`)

    statusMessage.value = 'Document generated successfully!'
  }
  catch (error) {
    console.error('Error generating document:', error)
    statusMessage.value = `Error: ${error.message}`
    statusError.value = true
  }
  finally {
    isLoading.value = false
  }
}

// Columns
const columns = [
  {
    key: 'studentGroup',
    label: 'Group',
    sortable: false
  },
  {
    key: 'name',
    label: 'Full Name',
    sortable: true
  },
  {
    key: 'actions',
    label: 'Actions',
    sortable: false
  },
  {
    key: 'status',
    label: 'Būsena',
    sortable: true
  }
]

const selectedColumns = ref(columns)
const columnsTable = computed(() => columns.filter(column => selectedColumns.value.includes(column)))
const excludeSelectColumn = computed(() => columns.filter(v => v.key !== 'select'))

// Selected Rows
const selectedRows = ref([])

function select(row) {
  const index = selectedRows.value.findIndex(item => item.id === row.id)
  if (index === -1) {
    selectedRows.value.push(row)
  }
  else {
    selectedRows.value.splice(index, 1)
  }
}

const search = ref('')
const selectedStatus = ref([])

// Pagination - Make sure these are all number types
const sort = ref({ column: 'id', direction: 'asc' as const })
const page = ref(1)
const pageCount = ref(10) // Initialize as number

// Modal state
const isOpen = ref(false)
const isOpenReport = ref(false)
const videoObject = ref<Video | null>(null)
const studentObject = ref<StudentRecord | null>(null)
const isFetchingDocument = ref(false)

const sendStudentData = (mVideo: Video, mStudent: StudentRecord) => {
  isOpen.value = true
  videoObject.value = mVideo
  studentObject.value = mStudent
}

const sendStudentReportData = (mStudent: StudentRecord) => {
  isOpenReport.value = true
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

// Interfaces

interface Document {
  id: number
  documentType: string
  filePath: string
  uploadedDate: number
  studentRecordId: number
}

interface Video {
  id: number
  studentRecordId: number
  uid: string
  thumbnail?: string
  preview?: string
  hlsUrl?: string
  dashUrl?: string
  createdAt: number
}

interface SupervisorReport {
  id: number
  studentRecordId: number
  supervisorComments: string
  grade: number
  feedback?: string
  createdDate: number
}

interface ReviewerReport {
  id: number
  studentRecordId: number
  reviewerComments: string
  assessment?: string
  recommendations?: string
  createdDate: number
}

// Filters
const nameFilter = ref('')
const groupFilter = ref('')
const programFilter = ref('')
const yearFilter = ref(null)

// Reset all filters
const resetFilters = () => {
  search.value = ''
  selectedStatus.value = []
  yearFilter.value = null
  groupFilter.value = ''
  programFilter.value = ''
}

// Dynamic years from API
const { years: availableYears, isLoading: yearsLoading, error: yearsError } = useAcademicYears()

// Load all data once by year
const { data: allStudents, status, error: fetchError } = useLazyAsyncData('allStudents', async () => {
  // Use the yearFilter if provided, otherwise send the request without a year parameter
  // This will trigger our backend to find the latest year
  const params = new URLSearchParams()
  if (yearFilter.value) {
    params.set('year', yearFilter.value.toString())
  }

  try {
    const response = await $fetch(`/api/students/supervisor?${params.toString()}`)
    return response
  }
  catch (err) {
    console.error('Error fetching student data:', err)
    throw err
  }
}, {
  default: () => ({
    students: [],
    total: 0,
    year: null
  }),
  watch: [yearFilter] // Only reload when year filter changes
})

// Get the active year (either selected or from API)
const activeYear = computed(() => {
  return yearFilter.value || allStudents.value?.year || null
})

// Client-side filtering
const filteredStudents = computed(() => {
  if (!allStudents.value?.students) {
    return { students: [], total: 0 }
  }

  let result = [...allStudents.value.students]

  // Apply search filter
  if (search.value.trim()) {
    const searchTerm = search.value.toLowerCase().trim()
    result = result.filter((item) => {
      const student = item.student
      return (
        (student.studentName || '').toLowerCase().includes(searchTerm)
        || (student.studentLastname || '').toLowerCase().includes(searchTerm)
        || (student.studentEmail || '').toLowerCase().includes(searchTerm)
        || (student.studentNumber || '').toLowerCase().includes(searchTerm)
        || (student.studentGroup || '').toLowerCase().includes(searchTerm)
        || (student.studyProgram || '').toLowerCase().includes(searchTerm)
      )
    })
  }

  // Apply group filter
  if (groupFilter.value) {
    result = result.filter(item => item.student.studentGroup === groupFilter.value)
  }

  // Apply program filter
  if (programFilter.value) {
    result = result.filter(item => item.student.studyProgram === programFilter.value)
  }

  // Apply sorting
  result.sort((a, b) => {
    let valA, valB

    if (sort.value.column === 'name') {
      valA = `${a.student.studentName} ${a.student.studentLastname}`.toLowerCase()
      valB = `${b.student.studentName} ${b.student.studentLastname}`.toLowerCase()
    }
    else {
      valA = a.student.id
      valB = b.student.id
    }

    if (sort.value.direction === 'asc') {
      return valA > valB ? 1 : -1
    }
    else {
      return valA < valB ? 1 : -1
    }
  })

  // Apply pagination
  const totalCount = result.length
  const startIndex = (page.value - 1) * pageCount.value
  const paginatedResult = result.slice(startIndex, startIndex + pageCount.value)

  return {
    students: paginatedResult,
    total: totalCount
  }
})

// Get unique values for dropdowns from all data
const uniqueGroups = computed(() => {
  if (!allStudents.value?.students) return []
  return [...new Set(allStudents.value.students.map(s => s.student.studentGroup))]
})

const uniquePrograms = computed(() => {
  if (!allStudents.value?.students) return []
  return [...new Set(allStudents.value.students.map(s => s.student.studyProgram))]
})

// Client-side pagination calculations
const pageTotal = computed(() => filteredStudents.value?.total || 0)
const pageFrom = computed(() => (page.value - 1) * Number(pageCount.value) + 1)
const pageTo = computed(() => Math.min(page.value * Number(pageCount.value), pageTotal.value))

// Make sure pageCount is always a number
watch(pageCount, (newValue) => {
  if (typeof newValue === 'string') {
    pageCount.value = Number(newValue)
  }
})

// Reset page when filters change
watch([search, groupFilter, programFilter, pageCount], () => {
  page.value = 1
})
</script>

<template>
  <UCard
    class="w-full"
    :ui="{
      base: '',
      ring: '',
      divide: 'divide-y divide-gray-200 dark:divide-gray-700',
      header: { padding: 'px-4 py-5' },
      body: { padding: '', base: 'divide-y divide-gray-200 dark:divide-gray-700' },
      footer: { padding: 'p-4' }
    }"
  >
    <div class="flex items-center justify-between gap-3 px-4 py-3">
      <UInput
        v-model="search"
        icon="i-heroicons-magnifying-glass-20-solid"
        class="w-full"
        placeholder="Search..."
      />
    </div>

    <div class="flex flex-col md:flex-row md:justify-between md:items-center w-full px-4 py-3 gap-3">
      <div class="grid grid-cols-2 gap-x-4 gap-y-2 sm:flex sm:flex-wrap sm:items-center">
        <div class="flex items-center gap-1.5">
          <span class="text-sm leading-5 whitespace-nowrap">Kiek įrašų:</span>
          <USelect
            v-model="pageCount"
            :options="[3, 5, 10, 20, 30, 40]"
            class="w-16"
            size="xs"
            @update:model-value="value => pageCount = Number(value)"
          />
        </div>

        <div class="flex items-center gap-1.5">
          <span class="text-sm leading-5 whitespace-nowrap">Metai</span>
          <USelect
            v-model="yearFilter"
            :options="availableYears"
            class="w-20"
            size="xs"
            placeholder="Latest"
            clearable
            :loading="yearsLoading"
          />
        </div>

        <div class="flex items-center gap-1.5">
          <span class="text-sm leading-5 whitespace-nowrap">Grupė</span>
          <USelect
            v-model="groupFilter"
            :options="uniqueGroups"
            class="w-24 flex-grow"
            size="xs"
            placeholder="All"
            clearable
          />
        </div>

        <div class="flex items-center gap-1.5">
          <span class="text-sm leading-5 whitespace-nowrap">Programa</span>
          <USelect
            v-model="programFilter"
            :options="uniquePrograms"
            class="w-24 flex-grow"
            size="xs"
            placeholder="All"
            clearable
          />
        </div>
      </div>

      <div class="flex flex-wrap gap-2 items-center justify-start md:justify-end mt-2 md:mt-0">
        <USelectMenu
          v-model="selectedColumns"
          :options="excludeSelectColumn"
          multiple
        >
          <UButton
            icon="i-heroicons-view-columns"
            color="gray"
            size="xs"
          >
            Columns
          </UButton>
        </USelectMenu>

        <UButton
          icon="i-heroicons-funnel"
          color="gray"
          size="xs"
          :disabled="search === '' && selectedStatus.length === 0 && !yearFilter && !groupFilter && !programFilter"
          @click="resetFilters"
        >
          Reset
        </UButton>
      </div>
    </div>
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

    <UModal
      v-model="isOpenReport"
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
              @click="isOpenReport = false"
            />
          </div>

          <div class="container mx-auto py-8 px-4">
            <h1 class="text-2xl font-bold mb-6">
              {{ studentObject?.finalProjectTitle }}
            </h1>

            <PlagiarismReportForm
              :student="studentObject"
              @submit="generateReport"
            />

            <div
              v-if="isLoading"
              class="mt-4 p-4 bg-blue-100 text-blue-700"
            >
              Processing document... This may take a moment.
            </div>

            <div
              v-if="statusMessage"
              class="mt-4 p-4"
              :class="statusError ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'"
            >
              {{ statusMessage }}
            </div>
          </div>
        </template>
      </UCard>
    </UModal>

    <div
      v-if="status === 'pending'"
      class="p-6 text-center"
    >
      <UIcon
        name="i-heroicons-arrow-path"
        class="animate-spin h-8 w-8 mx-auto text-gray-400"
      />
      <p class="mt-2 text-sm text-gray-500">
        Loading student data...
      </p>
    </div>

    <div
      v-else-if="fetchError"
      class="p-4 text-red-500"
    >
      {{ fetchError.message }}
    </div>

    <div
      v-else-if="filteredStudents.students.length === 0"
      class="p-6 text-center"
    >
      <UIcon
        name="i-heroicons-document-magnifying-glass"
        class="h-10 w-10 mx-auto text-gray-400"
      />
      <p class="mt-2 text-gray-500">
        No students found matching your criteria
      </p>
    </div>

    <UTable
      v-else
      v-model:sort="sort"
      :rows="filteredStudents.students"
      :columns="columnsTable"
      :loading="status === 'pending'"
      sort-asc-icon="i-heroicons-arrow-up"
      sort-desc-icon="i-heroicons-arrow-down"
      sort-mode="manual"
      class="w-full"
      :ui="{
        td: { base: 'whitespace-nowrap px-2 py-1' },
        th: { base: 'px-2 py-1' },
        default: { checkbox: { color: 'primary' } }
      }"
      @select="select"
    >
      <template #studentGroup-data="{ row }">
        <div class="text-center w-12">
          {{ row.student.studentGroup }}
        </div>
      </template>

      <template #name-data="{ row }">
        <div class="w-60 truncate">
          {{ row.student.studentName }} {{ row.student.studentLastname }}
        </div>
        <div class="text-xs font-300">
          ({{ row.student.finalProjectTitle }})
        </div>
      </template>

      <template #actions-data="{ row }">
        <div class="flex items-center justify-center gap-1 w-[max-content] flex-nowrap">
          <UButton
            v-if="row.videos && row.videos[0]"
            icon="i-heroicons-video-camera"
            size="xs"
            color="white"
            variant="solid"
            label="Vaizdo"
            :trailing="false"
            class="p-1 text-xs"
            @click="sendStudentData(row.videos[0], row.student)"
          />

          <template
            v-for="doc in row.documents || []"
            :key="doc.id"
          >
            <UButton
              :loading="isFetchingDocument"
              :icon="doc.documentType === 'PDF' ? 'i-heroicons-document-text' : 'i-heroicons-code-bracket-square'"
              size="xs"
              color="white"
              variant="solid"
              :label="doc.documentType === 'PDF' ? 'PDF' : 'ZIP'"
              :trailing="false"
              class="p-1 text-xs"
              @click="openDocument(doc)"
            />
          </template>

          <template v-if="row.reviewerReports && row.reviewerReports.length > 0">
            <div class="text-sm text-gray-500 truncate">
              Report added
            </div>
          </template>
          <template v-else>
            <UButton
              icon="i-heroicons-plus-circle"
              size="xs"
              color="primary"
              variant="solid"
              :label="$t('supervisor_report')"
              :trailing="false"
              class="p-1 text-xs"
              @click="sendStudentReportData(row.student)"
            />
          </template>
        </div>
      </template>

      <template #status-data="{ row }">
        <div class="flex items-center gap-2 justify-center">
          <template v-if="row.supervisorReports && row.supervisorReports.length > 0">
            <UIcon
              name="i-heroicons-check-circle"
              class="w-5 h-5 text-green-500"
            />
            <span>Atsiliepimas pateiktas</span>
          </template>
          <template v-else>
            <UIcon
              name="i-heroicons-clock"
              class="w-5 h-5 text-yellow-500"
            />
            <span>Laukiama...</span>
          </template>
        </div>
      </template>
    </UTable>

    <template #footer>
      <div class="flex flex-wrap justify-between items-center">
        <div>
          <span class="text-sm leading-5">
            Showing
            <span class="font-medium">{{ pageFrom }}</span>
            to
            <span class="font-medium">{{ pageTo }}</span>
            of
            <span class="font-medium">{{ pageTotal }}</span>
            results
          </span>
          <span class="ml-2 text-sm text-gray-600">
            Year: {{ activeYear || 'Latest' }}
          </span>
        </div>

        <UPagination
          v-model="page"
          :page-count="Number(pageCount)"
          :total="pageTotal"
          :ui="{
            wrapper: 'flex items-center gap-1',
            rounded: '!rounded-full min-w-[32px] justify-center',
            default: {
              activeButton: {
                variant: 'outline'
              }
            }
          }"
        />
      </div>
    </template>
  </UCard>
</template>
