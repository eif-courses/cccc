<template>
  <div>
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
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-3">
        <div class="flex flex-1 w-full sm:w-auto">
          <UInput
            v-model="search"
            icon="i-heroicons-magnifying-glass-20-solid"
            placeholder="Search..."
            class="w-full"
          />
        </div>

        <div class="flex items-center gap-3">
          <div class="flex items-center gap-2">
            <UToggle
              v-model="showFavoritesOnly"
              color="amber"
            >
              <template #left>
                <UIcon
                  name="i-heroicons-star"
                  class="w-5 h-5 text-amber-400"
                />
              </template>
            </UToggle>

            <!-- Label next to toggle -->
            <span
              class="text-sm font-medium text-gray-700 dark:text-gray-300 select-none cursor-pointer"
              @click="showFavoritesOnly = !showFavoritesOnly"
            >
              Favorites
              <UBadge
                v-if="allStudents.value?.students?.filter(s => s.student.isFavorite === 1).length > 0"
                color="amber"
                variant="solid"
                size="xs"
                class="ml-1"
              >
                {{ allStudents.value?.students?.filter(s => s.student.isFavorite === 1).length }}
              </UBadge>
            </span>
          </div>
        </div>
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
              placeholder="All"
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
            :disabled="search === '' && selectedStatus.length === 0 && !yearFilter && !groupFilter && !programFilter && !showFavoritesOnly"
            @click="resetFilters"
          >
            Reset
          </UButton>
        </div>
      </div>

      <UTable
        v-if="filteredStudents.students.length > 0"
        :key="`table-${updateCounter}`"
        v-model:sort="sort"
        :rows="filteredStudents.students"
        :columns="columnsTable"
        :loading="status === 'pending' || isRefreshing"
        sort-asc-icon="i-heroicons-arrow-up"
        sort-desc-icon="i-heroicons-arrow-down"
        sort-mode="manual"
        class="w-full"
        :ui="{
          td: { base: 'whitespace-nowrap px-2 py-1' },
          th: { base: 'px-2 py-1' },
          default: { checkbox: { color: 'primary' } }
        }"
      >
        <template #favorite-data="{ row }">
          <div class="flex justify-center items-center">
            <!-- Using v-if/v-else for better reactivity -->
            <UButton
              v-if="row.student.isFavorite === 1"
              icon="i-heroicons-star-solid"
              size="xs"
              color="amber"
              variant="ghost"
              class="rounded-full w-8 h-8 p-0 transition-all duration-200 opacity-100"
              @click.stop="toggleFavorite(row.student)"
            />
            <UButton
              v-else
              icon="i-heroicons-star"
              size="xs"
              color="amber"
              variant="ghost"
              class="rounded-full w-8 h-8 p-0 transition-all duration-200 opacity-50 hover:opacity-80"
              @click.stop="toggleFavorite(row.student)"
            />
          </div>
        </template>

        <template #group-data="{ row }">
          <div class="text-center w-12">
            {{ row.student.studentGroup }}
          </div>
        </template>

        <template #name-data="{ row }">
          <div class="truncate">
            {{ row.student.studentName }} {{ row.student.studentLastname }}
          </div>
        </template>

        <template #supervisor-data="{ row }">
          <div class="truncate">
            {{ row.student.supervisorEmail }}
          </div>
          <template v-if="row.supervisorReports && row.supervisorReports.length > 0">
            <UButton
              icon="i-heroicons-plus-circle"
              size="xs"
              color="primary"
              variant="solid"
              :label="$t('supervisor_report')"
              :trailing="false"
              class="p-1 text-xs"
            />
          </template>
          <template v-else>
            <div class="flex gap-2 justify-left">
              <UIcon
                name="i-heroicons-clock"
                class="w-5 h-5 text-yellow-500"
              />
              <span>Laukiama...</span>
            </div>
          </template>
        </template>

        <template #reviewer-data="{ row }">
          <div class="truncate">
            {{ row.student.reviewerName }}
          </div>
          <template v-if="row.reviewerReports && row.reviewerReports.length > 0">
            <UButton
              icon="i-heroicons-plus-circle"
              size="xs"
              color="primary"
              variant="solid"
              label="Recenzija"
              :trailing="false"
              class="p-1 text-xs"
            />
          </template>
          <template v-else>
            <div class="flex gap-2 justify-left">
              <UIcon
                name="i-heroicons-clock"
                class="w-5 h-5 text-yellow-500"
              />
              <span>Laukiama...</span>
            </div>
          </template>
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
          </div>
        </template>

        <!--        <template #status-data="{ row }"> -->
        <!--          <div class="flex items-center gap-2 justify-center"> -->
        <!--            <template v-if="row.reviewerReports && row.reviewerReports.length > 0 && row.supervisorReports && row.supervisorReports.length > 0"> -->
        <!--              <UIcon -->
        <!--                name="i-heroicons-check-circle" -->
        <!--                class="w-5 h-5 text-green-500" -->
        <!--              /> -->
        <!--              <span>Pateikta</span> -->
        <!--            </template> -->
        <!--            <template v-else> -->
        <!--              <UIcon -->
        <!--                name="i-heroicons-clock" -->
        <!--                class="w-5 h-5 text-yellow-500" -->
        <!--              /> -->
        <!--              <span>Laukiama...</span> -->
        <!--            </template> -->
        <!--          </div> -->
        <!--        </template> -->
      </UTable>

      <div
        v-if="status === 'pending' || isRefreshing"
        class="p-6 text-center"
      >
        <UIcon
          name="i-heroicons-arrow-path"
          class="animate-spin h-8 w-8 mx-auto text-gray-400"
        />
        <p class="mt-2 text-sm text-gray-500">
          {{ isRefreshing ? 'Refreshing data...' : 'Loading student data...' }}
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
        <UButton
          v-if="showFavoritesOnly"
          color="gray"
          size="sm"
          class="mt-3"
          @click="showFavoritesOnly = false"
        >
          Clear favorites filter
        </UButton>
      </div>

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
          </div>

          <div class="flex items-center gap-2">
            <UButton
              v-if="allStudents.value?.students?.length > 0"
              icon="i-heroicons-arrow-path"
              color="gray"
              variant="ghost"
              size="sm"
              :loading="isRefreshing"
              @click="refreshData"
            >
              Refresh
            </UButton>

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
        </div>
      </template>
    </UCard>

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
              {{ studentObject?.studentGroup }}, {{ studentObject?.studentName }} {{ studentObject?.studentLastname }} ({{ studentObject?.currentYear }})
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
              v-if="videoObject?.uid"
              :src="`https://customer-lgoylb8hch1to7bf.cloudflarestream.com/${videoObject.uid}/iframe`"
              style="border: none; width: 800px; height: 450px;"
              allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
              allowfullscreen
            />
          </div>
        </div>
      </UCard>
    </UModal>
  </div>
</template>

<script lang="ts" setup>
definePageMeta({
  middleware: ['department-access']
})

const columns = [{
  key: 'favorite',
  sortable: false,
  class: 'w-10'
},
{
  key: 'group',
  label: 'Group',
  sortable: false
},
{
  key: 'name',
  label: 'Full Name',
  sortable: true
},
{
  key: 'reviewer',
  label: 'Reviewer',
  sortable: true
},
{
  key: 'supervisor',
  label: 'Supervisor',
  sortable: true
},
{
  key: 'actions',
  label: 'Actions',
  sortable: false
}
// {
//   key: 'status',
//   label: 'Būsena',
//   sortable: true
// }
]

const selectedColumns = ref(columns)
const columnsTable = computed(() => columns.filter(column => selectedColumns.value.includes(column)))
const excludeSelectColumn = computed(() => columns.filter(v => v.key !== 'select'))

const showFavoritesOnly = ref(false)
const isRefreshing = ref(false)

const toast = useToast()

const updateCounter = ref(0)

// Simplified toggle function that forces refresh
async function toggleFavorite(student) {
  try {
    // Get the current status and prepare new status
    const currentStatus = student.isFavorite
    const newStatus = currentStatus === 1 ? 0 : 1
    const actionText = newStatus === 1 ? 'added to' : 'removed from'

    // Set loading state
    isRefreshing.value = true

    // Call API to update favorite status
    await $fetch(`/api/students/favorite/${student.id}`, {
      method: 'PATCH',
      body: { isFavorite: newStatus }
    })

    // After API succeeds, refresh the data
    const queryParams = new URLSearchParams()
    if (yearFilter.value) {
      queryParams.set('year', yearFilter.value.toString())
    }

    // Get fresh data from server
    const response = await $fetch(`/api/students/department?${queryParams.toString()}`)

    // Update the data
    allStudents.value = response

    // Increment counter to force complete UI refresh
    updateCounter.value++

    // Show success notification
    toast.add({
      title: `${student.studentName} ${student.studentLastname}`,
      description: `Successfully ${actionText} favorites`,
      icon: newStatus === 1 ? 'i-heroicons-star-solid' : 'i-heroicons-star',
      color: 'amber',
      timeout: 3000
    })
  }
  catch (error) {
    console.error('Error updating favorite status:', error)

    // Show error toast
    toast.add({
      title: 'Error',
      description: 'Failed to update favorites status',
      icon: 'i-heroicons-exclamation-triangle',
      color: 'red',
      timeout: 5000
    })
  }
  finally {
    isRefreshing.value = false
  }
}

// Use the same function for the refresh button
async function refreshData() {
  if (isRefreshing.value) return

  isRefreshing.value = true
  try {
    const queryParams = new URLSearchParams()
    if (yearFilter.value) {
      queryParams.set('year', yearFilter.value.toString())
    }

    const response = await $fetch(`/api/students/department?${queryParams.toString()}`)
    allStudents.value = response

    // Increment counter to force UI refresh
    updateCounter.value++

    toast.add({
      title: 'Data refreshed',
      description: 'Student data has been updated',
      icon: 'i-heroicons-check-circle',
      color: 'green',
      timeout: 2000
    })
  }
  catch (error) {
    console.error('Error refreshing data:', error)
    toast.add({
      title: 'Error',
      description: 'Failed to refresh data',
      icon: 'i-heroicons-exclamation-triangle',
      color: 'red',
      timeout: 5000
    })
  }
  finally {
    isRefreshing.value = false
  }
}

const search = ref('')
const selectedStatus = ref([])

const sort = ref({ column: 'id', direction: 'asc' as const })
const page = ref(1)
const pageCount = ref(10)

// Modal state
const isOpen = ref(false)
const videoObject = ref(null)
const studentObject = ref(null)
const isFetchingDocument = ref(false)

const sendStudentData = (mVideo, mStudent) => {
  isOpen.value = true
  videoObject.value = mVideo
  studentObject.value = mStudent
}

async function getFile(fileName) {
  try {
    const response = await $fetch(`/api/blob/get/${fileName}`)
    if (response?.url) {
      return response.url
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

const openDocument = async (doc) => {
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

const groupFilter = ref('')
const programFilter = ref('')
const yearFilter = ref(null)

const resetFilters = () => {
  search.value = ''
  selectedStatus.value = []
  yearFilter.value = null
  groupFilter.value = ''
  programFilter.value = ''
  showFavoritesOnly.value = false
}

// Dynamic years from API
const { years: availableYears, isLoading: yearsLoading, error: yearsError } = useAcademicYears()

const { data: allStudents, status, error: fetchError } = useLazyAsyncData('allStudents', async () => {
  const queryParams = new URLSearchParams()
  if (yearFilter.value) {
    queryParams.set('year', yearFilter.value.toString())
  }

  try {
    const response = await $fetch(`/api/students/department?${queryParams.toString()}`)
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
  watch: [yearFilter]
})

const filteredStudents = computed(() => {
  if (!allStudents.value?.students) {
    return { students: [], total: 0 }
  }

  let result = [...allStudents.value.students]

  if (showFavoritesOnly.value) {
    result = result.filter(item => item.student.isFavorite === 1)
  }

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
        || (student.reviewerName || '').toLowerCase().includes(searchTerm)
        || (student.supervisorEmail || '').toLowerCase().includes(searchTerm)
      )
    })
  }

  if (groupFilter.value) {
    result = result.filter(item => item.student.studentGroup === groupFilter.value)
  }

  if (programFilter.value) {
    result = result.filter(item => item.student.studyProgram === programFilter.value)
  }

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

  const totalCount = result.length
  const startIndex = (page.value - 1) * pageCount.value
  const paginatedResult = result.slice(startIndex, startIndex + pageCount.value)

  return {
    students: paginatedResult,
    total: totalCount
  }
})

const uniqueGroups = computed(() => {
  if (!allStudents.value?.students) return []
  return [...new Set(allStudents.value.students.map(s => s.student.studentGroup))]
})

const uniquePrograms = computed(() => {
  if (!allStudents.value?.students) return []
  return [...new Set(allStudents.value.students.map(s => s.student.studyProgram))]
})

const pageTotal = computed(() => filteredStudents.value?.total || 0)
const pageFrom = computed(() => (page.value - 1) * Number(pageCount.value) + 1)
const pageTo = computed(() => Math.min(page.value * Number(pageCount.value), pageTotal.value))

watch(pageCount, (newValue) => {
  if (typeof newValue === 'string') {
    pageCount.value = Number(newValue)
  }
})

watch([search, groupFilter, programFilter, pageCount, showFavoritesOnly], () => {
  page.value = 1
})
</script>
