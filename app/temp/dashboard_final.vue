<template>
  <div>
    <h1>Files for Student: {{ user.displayName }}</h1>

    <input
      type="file"
      @change="uploadWithPresignedUrl($event.target.files[0])"
    >

    <div v-if="blobs.length">
      <ul>
        <li
          v-for="blob in blobs"
          :key="blob.httpEtag"
        >
          <div>
            <strong>{{ blob.pathname }}</strong>
            <span> ({{ blob.contentType }}) - {{ formatSize(blob.size) }} </span>
            <span> - Uploaded at: {{ new Date(blob.uploadedAt).toLocaleString() }}</span>

            <!-- Preview button -->
            <button
              class="preview-btn"
              @click="previewFile(blob.url)"
            >
              Preview
            </button>
          </div>
        </li>
      </ul>

      <div v-if="hasMore">
        <button @click="loadMore">
          Load More
        </button>
      </div>
    </div>

    <div v-else>
      <p>No files found for this student.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
const blobs = ref([])
const hasMore = ref(false)
const cursor = ref(undefined)

definePageMeta({
  middleware: 'auth'
})

const { loggedIn, user } = useUserSession()

async function uploadWithPresignedUrl(file: File) {
  if (!loggedIn) return

  if (!user) {
    console.error('User is not defined')
    return
  }

  // Properly encode special characters in the display name and user ID
  const displayName = encodeURIComponent(user.value?.displayName?.normalize('NFC') ?? 'unknown')
  const userId = user.value?.id ?? 'no_id'
  const fileName = encodeURIComponent(file.name)

  // Construct the file path
  const filePath = `${displayName}_${userId}/${fileName}`

  try {
    // Get the pre-signed URL
    const { url } = await $fetch(`/api/blob/sign/PS/2025/${filePath}`)

    // Upload the file
    await $fetch(url, {
      method: 'PUT',
      body: file
    })

    // await fetchFiles(); // Uncomment if needed
  }
  catch (error) {
    console.error('File upload failed:', error)
  }
}

// Fetch files function
const fetchFiles = async (cursorParam) => {
  if (!loggedIn) return

  if (!user) {
    console.error('User is not defined')
    return
  }

  // Properly encode special characters in the display name and user ID
  const displayName = encodeURIComponent(user.value?.displayName?.normalize('NFC') ?? 'unknown')
  const userId = user.value?.id ?? 'no_id'

  // Construct the file path
  const filePath = `${displayName}_${userId}`

  const { data, error } = await useFetch(`/api/blob/list/PS/2025/${filePath}`, {
    params: {
      cursor: cursorParam,
      limit: 10
    }
  })

  if (error.value) {
    console.error('Error fetching files:', error.value)
  }
  else {
    blobs.value = data.value.blobs // Replace the list instead of appending to prevent duplicates
    hasMore.value = data.value.hasMore
    cursor.value = data.value.cursor
  }
}

// Open file preview
const previewFile = (url) => {
  window.open(url, '_blank') // Opens the file in a new tab
}

// Format size for display
const formatSize = (size) => {
  if (size < 1024) return size + ' bytes'
  else if (size < 1048576) return (size / 1024).toFixed(2) + ' KB'
  else return (size / 1048576).toFixed(2) + ' MB'
}

// Trigger file input manually
const triggerFileInput = () => {
  document.querySelector('.file-input')?.click()
}

// Initial fetch
fetchFiles()

// Load more function
const loadMore = () => {
  fetchFiles(cursor.value)
}
</script>

<style scoped>
.upload-container {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}

.file-input {
  display: none; /* Hide the default file input */
}

.upload-btn {
  padding: 8px 12px;
  background-color: #28a745;
  color: white;
  border: none;
  cursor: pointer;
  border-radius: 5px;
}

.upload-btn:hover {
  background-color: #218838;
}

.preview-btn {
  margin-left: 10px;
  padding: 5px 10px;
  background-color: #007bff;
  color: white;
  border: none;
  cursor: pointer;
  border-radius: 5px;
}

.preview-btn:hover {
  background-color: #0056b3;
}
</style>
