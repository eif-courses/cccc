<template>
  <div class="video-player">
    <video
      v-if="videoUrl"
      ref="videoElement"
      controls
      preload="metadata"
      :class="className"
    >
      <source
        :src="videoUrl"
        :type="contentType"
      >
      Your browser does not support the video tag.
    </video>
    <div
      v-else
      class="video-player-loading"
    >
      Loading video...
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  videoKey: {
    type: String,
    default: null
  },
  videoUrl: {
    type: String,
    default: null
  },
  contentType: {
    type: String,
    default: 'video/mp4'
  },
  className: {
    type: String,
    default: ''
  }
})

const videoUrl = ref(props.videoUrl)

// If the key is provided but not the URL, fetch the signed URL
onMounted(async () => {
  if (!props.videoUrl && props.videoKey) {
    try {
      const response = await fetch(`/api/students/videos/url/${props.videoKey}`)

      if (!response.ok) {
        console.error('Failed to fetch video URL')
        return
      }

      const data = await response.json()
      videoUrl.value = data.url
    }
    catch (error) {
      console.error('Error loading video:', error)
    }
  }
})
</script>

<style scoped>
.video-player {
  width: 100%;
  position: relative;
  aspect-ratio: 16/9;
  background-color: #000;
}

.video-player video {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.video-player-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background-color: #111;
  color: #fff;
}
</style>
