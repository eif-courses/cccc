<script setup lang="ts">

// Initialize the upload function with your API endpoint
const upload = useUpload('/api/students/upload', { method: 'PUT' })

// Create reactive properties to track uploaded files and progress
const uploadedFiles = ref<{ name: string, url: string }[]>([])
const uploadProgress = ref<number>(0)
const isUploading = ref<boolean>(false)

// Handle file selection and upload
async function onFileSelect(event: Event) {
  const fileInput = event.target as HTMLInputElement

  if (!fileInput.files?.length) return

  const file = fileInput.files[0]

  // Start the upload process
  isUploading.value = true
  const { completed, progress, abort } = upload(file)

  // Watch for progress updates
  progress.value // Use this to display the progress
  const unsubscribe = progress.subscribe((currentProgress) => {
    uploadProgress.value = currentProgress
  })

  try {
    const response = await completed

    // File uploaded successfully
    if (response) {
      uploadedFiles.value.push({ name: response.pathname, url: response.pathname })
    }
  }
  catch (error) {
    console.error('Error uploading file:', error)
  }
  finally {
    // Clean up
    unsubscribe()
    isUploading.value = false
    uploadProgress.value = 0 // Reset progress
  }
}

// Function to open file in a new tab
const viewFile = (url: string) => {
  window.open(url, '_blank')
}
</script>

<template>
  <div class="max-w-3xl mx-auto p-6 bg-white shadow rounded-lg space-y-6">
    <h2 class="text-xl font-semibold">
      Baigiamojo darbo pateikimas
    </h2>

    <!-- File Upload -->
    <div class="space-y-4">
      <label class="block font-medium">Įkelti failą (ZIP arba Video)</label>
      <input
        type="file"
        name="file"
        accept=".zip,video/*"
        class="border p-2 rounded w-full"
        @change="onFileSelect"
      >
      <div
        v-if="isUploading"
        class="mt-2"
      >
        <progress
          class="w-full"
          :value="uploadProgress"
          max="100"
        />
        <p class="text-center">
          {{ uploadProgress.toFixed(0) }}%
        </p>
      </div>
    </div>

    <!-- Uploaded Files Section -->
    <div class="bg-gray-100 p-4 rounded-lg space-y-2">
      <p class="font-medium">
        Jūsų pateikti failai:
      </p>
      <div v-if="uploadedFiles.length">
        <div
          v-for="file in uploadedFiles"
          :key="file.name"
          class="flex items-center justify-between p-2 bg-white rounded shadow"
        >
          <span>{{ file.name }}</span>
          <button
            class="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
            @click="viewFile(file.url)"
          >
            Peržiūrėti
          </button>
        </div>
      </div>
      <p
        v-else
        class="text-gray-500"
      >
        Dar nėra įkeltų failų.
      </p>
    </div>
  </div>
</template>
