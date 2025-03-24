//pages/admin/logs.vue
<template>
  <div class="logs-container p-4">
    <h1 class="text-2xl font-bold mb-6">
      System Logs
    </h1>

    <div class="filters bg-gray-50 p-4 rounded mb-6 flex flex-wrap gap-4">
      <div>
        <label class="block text-sm text-gray-600 mb-1">Log Type</label>
        <select
          v-model="logType"
          class="border rounded px-3 py-2 w-full min-w-[150px]"
        >
          <option value="all">
            All Logs
          </option>
          <option value="db">
            Database Operations
          </option>
          <option value="file">
            Storage Operations
          </option>
          <option value="stream">
            Stream Operations
          </option>
          <option value="client">
            Client Errors
          </option>
        </select>
      </div>

      <div>
        <label class="block text-sm text-gray-600 mb-1">Status</label>
        <select
          v-model="status"
          class="border rounded px-3 py-2 w-full min-w-[150px]"
        >
          <option value="all">
            All Status
          </option>
          <option value="success">
            Success
          </option>
          <option value="error">
            Error
          </option>
        </select>
      </div>

      <div>
        <label class="block text-sm text-gray-600 mb-1">From Date</label>
        <input
          v-model="startDate"
          type="date"
          class="border rounded px-3 py-2 w-full"
        >
      </div>

      <div>
        <label class="block text-sm text-gray-600 mb-1">To Date</label>
        <input
          v-model="endDate"
          type="date"
          class="border rounded px-3 py-2 w-full"
        >
      </div>

      <div>
        <label class="block text-sm text-gray-600 mb-1">Operation</label>
        <input
          v-model="operation"
          type="text"
          placeholder="Filter by operation"
          class="border rounded px-3 py-2 w-full min-w-[200px]"
        >
      </div>

      <div>
        <label class="block text-sm text-gray-600 mb-1">Student ID</label>
        <input
          v-model="studentId"
          type="number"
          placeholder="Filter by student"
          class="border rounded px-3 py-2 w-full"
        >
      </div>

      <div class="flex items-end">
        <button
          class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          @click="fetchLogs(1)"
        >
          Apply Filters
        </button>
      </div>
    </div>

    <div
      v-if="loading"
      class="flex justify-center my-8"
    >
      <div class="spinner" />
    </div>

    <div v-else>
      <table
        v-if="logs.length"
        class="min-w-full bg-white"
      >
        <thead class="bg-gray-100">
          <tr>
            <th class="px-4 py-2">
              Timestamp
            </th>
            <th class="px-4 py-2">
              Type
            </th>
            <th class="px-4 py-2">
              Operation
            </th>
            <th class="px-4 py-2">
              Details
            </th>
            <th class="px-4 py-2">
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="log in logs"
            :key="log.id"
            :class="{ 'bg-red-50': !log.success }"
            class="border-b hover:bg-gray-50"
          >
            <td class="px-4 py-2">
              {{ formatDate(log.timestamp) }}
            </td>
            <td class="px-4 py-2">
              {{ getLogTypeLabel(log) }}
            </td>
            <td class="px-4 py-2">
              {{ log.operation }}
            </td>
            <td class="px-4 py-2">
              {{ getLogDetails(log) }}
            </td>
            <td class="px-4 py-2">
              <span
                :class="log.success
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'"
                class="px-2 py-1 rounded text-xs font-medium"
              >
                {{ log.success ? 'Success' : 'Error' }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Pagination -->
      <div
        v-if="pagination.totalPages > 1"
        class="mt-6 flex justify-center"
      >
        <nav class="flex items-center gap-1">
          <button
            :disabled="currentPage === 1"
            class="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50"
            @click="changePage(currentPage - 1)"
          >
            Previous
          </button>

          <div
            v-for="page in paginationRange"
            :key="page"
          >
            <button
              v-if="page !== '...'"
              :class="currentPage === page ? 'bg-blue-600 text-white' : 'bg-white'"
              class="px-3 py-1 border rounded hover:bg-gray-100"
              @click="changePage(page)"
            >
              {{ page }}
            </button>
            <span
              v-else
              class="px-3 py-1"
            >...</span>
          </div>

          <button
            :disabled="currentPage === pagination.totalPages"
            class="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50"
            @click="changePage(currentPage + 1)"
          >
            Next
          </button>
        </nav>
      </div>

      <div
        v-else-if="!logs.length"
        class="text-center py-8 text-gray-500"
      >
        No logs found matching your criteria.
      </div>
    </div>

    <!-- Error message -->
    <div
      v-if="error"
      class="mt-4 p-4 bg-red-100 text-red-800 rounded"
    >
      {{ error }}
    </div>
  </div>
</template>

<script setup>
const logType = ref('all')
const status = ref('all')
const startDate = ref('')
const endDate = ref('')
const operation = ref('')
const studentId = ref('')
const logs = ref([])
const loading = ref(false)
const error = ref(null)
const currentPage = ref(1)
const pagination = ref({
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0
})

onMounted(() => {
  fetchLogs(1)
})

async function fetchLogs(page = 1) {
  loading.value = true
  error.value = null
  currentPage.value = page

  try {
    const response = await $fetch('/api/admin/logs', {
      method: 'GET',
      params: {
        type: logType.value,
        status: status.value,
        startDate: startDate.value,
        endDate: endDate.value,
        operation: operation.value,
        studentId: studentId.value,
        page: page,
        limit: 20
      }
    })

    logs.value = response.logs
    pagination.value = response.pagination
  }
  catch (fetchError) {
    console.error('Failed to fetch logs', fetchError)
    error.value = 'Failed to load logs. Please try again.'
  }
  finally {
    loading.value = false
  }
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleString()
}

function getLogTypeLabel(log) {
  switch (log.log_type) {
    case 'db':
      return 'Database'
    case 'file':
      return 'Storage'
    case 'stream':
      return 'Stream'
    case 'client':
      return 'Client'
    default:
      return log.log_type || 'Unknown'
  }
}

function getLogDetails(log) {
  if (log.related_entity) return log.related_entity
  if (log.key) return log.key
  if (log.stream_id) return log.stream_id
  if (log.location) return log.location
  return '-'
}

function changePage(page) {
  if (page < 1 || page > pagination.value.totalPages) return
  fetchLogs(page)
}

// Calculate pagination range with ellipsis for large page counts
const paginationRange = computed(() => {
  const totalPages = pagination.value.totalPages
  const currentPageVal = currentPage.value

  if (totalPages <= 7) {
    // Show all pages
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }

  // Always show first and last page
  let pages = [1, totalPages]

  // Add current page and pages around it
  let middleStart = Math.max(2, currentPageVal - 1)
  let middleEnd = Math.min(totalPages - 1, currentPageVal + 1)

  // Adjust if we're near the start or end
  if (currentPageVal <= 3) {
    middleEnd = 4
  }
  else if (currentPageVal >= totalPages - 2) {
    middleStart = totalPages - 3
  }

  // Add middle pages
  for (let i = middleStart; i <= middleEnd; i++) {
    pages.push(i)
  }

  // Sort and deduplicate
  pages = [...new Set(pages)].sort((a, b) => a - b)

  // Add ellipsis
  const result = []
  let prev = 0

  for (const page of pages) {
    if (page - prev > 1) {
      result.push('...')
    }
    result.push(page)
    prev = page
  }

  return result
})
</script>

<style scoped>
.logs-container {
  max-width: 1200px;
  margin: 0 auto;
}

.spinner {
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top: 4px solid #3498db;
  width: 30px;
  height: 30px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
