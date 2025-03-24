<template>
  <div class="max-w-lg mx-auto p-6 bg-white shadow-lg rounded-lg">
    <h2 class="text-xl font-semibold mb-4">
      Upload ZIP File
    </h2>

    <!-- File Input -->
    <input
      ref="fileInput"
      type="file"
      accept=".zip"
      class="border p-2 w-full mb-3"
      @change="handleFileUpload"
    >

    <!-- Upload Progress -->
    <div
      v-if="uploading"
      class="mt-2 text-blue-600"
    >
      Uploading... <span>{{ uploadProgress }}%</span>
      <div class="h-2 w-full bg-gray-200 rounded mt-1">
        <div
          class="h-2 bg-blue-500 rounded"
          :style="{ width: uploadProgress + '%' }"
        />
      </div>
    </div>

    <!-- Success Message -->
    <div
      v-if="success"
      class="mt-2 text-green-600"
    >
      Upload successful!
    </div>

    <!-- Error Message -->
    <div
      v-if="errorMessage"
      class="mt-2 text-red-500"
    >
      {{ errorMessage }}
    </div>

    <!-- Upload Button -->
    <button
      :disabled="uploading"
      class="mt-4 bg-blue-500 text-white py-2 px-4 rounded disabled:bg-gray-400"
      @click="uploadFile"
    >
      Upload
    </button>
  </div>
</template>

<script setup>
const fileInput = ref(null)
const uploading = ref(false)
const success = ref(false)
const errorMessage = ref('')
const uploadProgress = ref(0)

const emit = defineEmits(['zipUploaded'])

const { loggedIn, user } = useUserSession()

const handleFileUpload = () => {
  success.value = false
  errorMessage.value = ''
}

const uploadWithPresignedUrl = async (file) => {
  if (!loggedIn || !user) return

  const fileName = encodeURIComponent(file.name)

  try {
    // Create a FormData object to send the file
    const formData = new FormData()
    formData.append('file', file)

    // Call the backend API to handle the upload and database insertion
    const response = await $fetch(`/api/blob/sign/${fileName}`, {
      method: 'POST',
      body: formData // Pass the file in the request body
    })

    if (response.error) {
      throw new Error(response.error)
    }

    success.value = true
    emit('zipUploaded')
  }
  catch (error) {
    errorMessage.value = error.message || 'An error occurred during the upload.'
  }
  finally {
    uploading.value = false
  }
}
const uploadFile = async () => {
  if (!fileInput.value.files.length) {
    errorMessage.value = 'Please select a ZIP file.'
    return
  }

  const file = fileInput.value.files[0]
  uploading.value = true
  uploadProgress.value = 0
  await uploadWithPresignedUrl(file)
}
</script>
