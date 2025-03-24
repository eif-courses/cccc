<template>
  <div class="max-w-lg mx-auto p-6 bg-white shadow-lg rounded-lg">
    <h2 class="text-xl font-semibold mb-4">
      Upload Video
    </h2>

    <!-- File Input -->
    <input
      ref="fileInput"
      type="file"
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

    <!-- Processing State -->
    <div
      v-if="processing"
      class="mt-2 text-yellow-500"
    >
      Processing video... Please wait.
    </div>

    <!-- Success Message -->
    <div
      v-if="success"
      class="mt-2 text-green-600"
    >
      Upload and save successful!
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
      :disabled="uploading || processing"
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
const processing = ref(false)
const success = ref(false)
const errorMessage = ref('')
const uploadProgress = ref(0)

const emit = defineEmits(['videoUploaded'])

// const { loggedIn, user } = useUserSession()

const handleFileUpload = () => {
  success.value = false
  errorMessage.value = ''
}

const uploadFile = async () => {
  if (!fileInput.value.files.length) {
    errorMessage.value = 'Please select a file.'
    return
  }

  const formData = new FormData()
  formData.append('file', fileInput.value.files[0])

  uploading.value = true
  uploadProgress.value = 0

  try {
    // Step 1: Upload file to server
    const uploadResponse = await fetch('/api/students/upload-video', {
      method: 'POST',
      body: formData
    })

    if (!uploadResponse.ok) throw new Error('Upload failed')

    const uploadData = await uploadResponse.json()
    if (!uploadData.success) throw new Error('Processing failed')

    // Simulate progress update
    for (let i = 10; i <= 100; i += 10) {
      uploadProgress.value = i
      await new Promise(r => setTimeout(r, 200))
    }

    uploading.value = false
    processing.value = true

    // Step 2: Call save-video-data API with all required data
    const saveResponse = await fetch('/api/students/save-video-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid: uploadData.data.uid,
        thumbnail: uploadData.data.thumbnail,
        preview: uploadData.data.preview,
        playback: uploadData.data.playback
      })
    })

    if (!saveResponse.ok) throw new Error('Failed to save video data')

    processing.value = false
    success.value = true
    emit('videoUploaded')
  }
  catch (error) {
    errorMessage.value = error.message || 'An error occurred.'
    processing.value = false
  }
  finally {
    uploading.value = false
    processing.value = false
  }
}
</script>
