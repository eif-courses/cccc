<template>
  <div>
    <input
      type="file"
      accept="video/*"
      @change="onFileChange"
    >
    <button
      :disabled="!selectedFile"
      @click="uploadFile"
    >
      Upload
    </button>

    <p v-if="uploading">
      Uploading... {{ uploadProgress }}%
    </p>
    <div v-if="uploading">
      <div
        class="progress-bar"
        :style="{ width: uploadProgress + '%' }"
      />
    </div>

    <div v-if="videoData">
      <h2>Video Uploaded Successfully!</h2>
      <p>Video UID: {{ videoData.uid }}</p>
      <p>
        Watch Video: <a
          :href="videoData.preview"
          target="_blank"
        >Preview</a>
      </p>
    </div>
  </div>
</template>

<script setup>
const selectedFile = ref(null)
const uploading = ref(false)
const uploadProgress = ref(0)
const videoData = ref(null)
const errorMessage = ref(null) // For displaying errors

const onFileChange = (event) => {
  selectedFile.value = event.target.files[0]
  console.log('Selected file:', selectedFile.value) // Log selected file details
}

const uploadFile = async () => {
  if (!selectedFile.value) return

  uploading.value = true
  uploadProgress.value = 0
  errorMessage.value = null // Reset error message

  const formData = new FormData()
  formData.append('file', selectedFile.value)

  const xhr = new XMLHttpRequest()

  // Set up the progress event handler
  xhr.upload.onprogress = (event) => {
    if (event.lengthComputable) {
      uploadProgress.value = Math.round((event.loaded / event.total) * 100)
      console.log(`Upload Progress: ${uploadProgress.value}%`) // Log progress to console
    }
  }

  // Handle the response after the upload is complete
  xhr.onload = async () => {
    if (xhr.status >= 200 && xhr.status < 300) {
      const data = JSON.parse(xhr.responseText)
      if (!data.success) {
        throw new Error('Upload failed: ' + data.message)
      }

      // Store video data after upload
      videoData.value = {
        uid: data.data.uid,
        thumbnail: data.data.thumbnail,
        preview: data.data.preview
      }

      // Call saveVideoData to save video details and maintain uploading state
      await saveVideoData(videoData.value)

      // Show success message and preview link
      console.log('Video Uploaded Successfully:', videoData.value)
    }
    else {
      throw new Error(`Failed to upload file: ${xhr.statusText}`)
    }
  }

  // Handle any errors
  xhr.onerror = () => {
    errorMessage.value = 'Upload failed, please try again.'
    console.error('Upload failed:', xhr.statusText)
    uploading.value = false // Stop uploading state on error
  }

  // Open the request
  xhr.open('POST', '/api/upload-video', true)
  // Send the FormData
  xhr.send(formData)
}

// Function to save video data to the database
const saveVideoData = async (videoInfo) => {
  try {
    const response = await fetch('/api/save-video-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        uid: videoInfo.uid,
        thumbnail: videoInfo.thumbnail,
        preview: videoInfo.preview
      })
    })

    if (!response.ok) {
      throw new Error(`Failed to save video data: ${response.statusText}`)
    }

    console.log('Video data saved successfully.')
    // Reset uploading state after data is saved
    uploading.value = false
  }
  catch (error) {
    console.error('Failed to save video data:', error)
    errorMessage.value = 'Failed to save video data, please try again.'
    uploading.value = false // Ensure to stop the uploading state on error
  }
}
</script>

<style scoped>
.progress-bar {
  height: 5px;
  background-color: #4caf50;
  transition: width 0.3s;
}
</style>
