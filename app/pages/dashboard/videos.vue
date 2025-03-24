<template>
  <div class="container">
    <h1>My Thesis Videos</h1>

    <!-- File Upload -->
    <div class="upload-section">
      <form
        enctype="multipart/form-data"
        @submit.prevent="uploadVideo"
      >
        <div class="file-input">
          <label for="video-file">Select Video File</label>
          <input
            id="video-file"
            type="file"
            accept="video/*"
            required
            @change="handleFileChange"
          >
        </div>
        <button
          type="submit"
          :disabled="isUploading"
        >
          {{ isUploading ? 'Uploading...' : 'Upload Video' }}
        </button>
      </form>
    </div>

    <!-- Video List -->
    <div
      v-if="videos.length > 0"
      class="videos-list"
    >
      <div
        v-for="video in videos"
        :key="video.id"
        class="video-item"
      >
        <VideoPlayer
          :video-key="video.key"
          :content-type="video.contentType"
          class="video-player"
        />
        <div class="video-info">
          <h3>{{ video.filename }}</h3>
          <p>Uploaded: {{ formatDate(video.createdAt) }}</p>
        </div>
      </div>
    </div>
    <div
      v-else
      class="no-videos"
    >
      <p>No videos uploaded yet.</p>
    </div>
  </div>
</template>

<script setup>
const videos = ref([])
const isUploading = ref(false)
const selectedFile = ref(null)

// Format dates
const formatDate = (timestamp) => {
  const date = new Date(timestamp)
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
}

// Handle file selection
const handleFileChange = (event) => {
  selectedFile.value = event.target.files[0]
}

// Upload video
const uploadVideo = async () => {
  if (!selectedFile.value) return

  isUploading.value = true

  try {
    const formData = new FormData()
    formData.append('file', selectedFile.value)

    // Upload to R2
    const uploadResponse = await fetch('/api/students/videos/upload', {
      method: 'POST',
      body: formData
    })

    if (!uploadResponse.ok) {
      throw new Error('Upload failed')
    }

    const uploadResult = await uploadResponse.json()

    if (!uploadResult.success) {
      throw new Error(uploadResult.message || 'Upload failed')
    }

    // Save to database
    // const saveResponse = await fetch('/api/students/videos/save', {
    //   method: 'POST',
    //   body: JSON.stringify(uploadResult.data),
    //   headers: {
    //     'Content-Type': 'application/json'
    //   }
    // })
    //
    // if (!saveResponse.ok) {
    //   throw new Error('Failed to save video data')
    // }

    // Refresh video list
    await fetchVideos()

    // Reset the form
    selectedFile.value = null
    document.getElementById('video-file').value = ''
  }
  catch (error) {
    console.error('Error uploading video:', error)
    alert('Failed to upload video: ' + error.message)
  }
  finally {
    isUploading.value = false
  }
}

// Fetch videos for the current user
const fetchVideos = async () => {
  try {
    const response = await fetch('/api/students/videos/list')

    if (!response.ok) {
      throw new Error('Failed to fetch videos')
    }

    const result = await response.json()
    videos.value = result.videos || []
  }
  catch (error) {
    console.error('Error fetching videos:', error)
  }
}

// Fetch videos on component mount
onMounted(() => {
  fetchVideos()
})
</script>

<style scoped>
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.upload-section {
  margin-bottom: 2rem;
  padding: 1.5rem;
  border: 1px solid #eee;
  border-radius: 8px;
  background-color: #f9f9f9;
}

.file-input {
  margin-bottom: 1rem;
}

.videos-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.video-item {
  border: 1px solid #eee;
  border-radius: 8px;
  overflow: hidden;
  background-color: #fff;
}

.video-player {
  width: 100%;
  aspect-ratio: 16/9;
}

.video-info {
  padding: 1rem;
}

.no-videos {
  text-align: center;
  padding: 2rem;
  background-color: #f9f9f9;
  border-radius: 8px;
}

button {
  padding: 0.5rem 1rem;
  background-color: #0070f3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}
</style>
