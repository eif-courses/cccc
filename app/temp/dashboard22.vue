<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
})

// const authStore = useAuthStore()
const { loggedIn, user } = useUserSession()

async function uploadWithPresignedUrl(file: File) {
  if (loggedIn) {
    // const user = authStore.user

    const filePath = `PS/2025/PI22S/${user.value?.displayName}_${user.value?.id}/${file.name}`
    const { url } = await $fetch(`/api/blob/sign/${filePath}`)

    await $fetch(url, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type || 'application/octet-stream' // Correct MIME type
      }
    })
  }
}

const fileUrl = ref('')

async function getFile(fileName: string) {
  const filePath = `PS/2025/PI22S/${user.value?.displayName}_${user.value?.id}/${fileName}`
  const { url } = await $fetch(`/api/blob/get/${filePath}`)
  return url // This is a temporary link to access the file
}

async function fetchFile() {
  fileUrl.value = await getFile('PEN%20QM%20Adaptation.pdf')
}
</script>

<template>
  {{ user }}
  <input
      type="file"
      @change="uploadWithPresignedUrl($event.target.files[0])"
  >

  <div>
    <button @click="fetchFile">
      Get File
    </button>
    <a
        v-if="fileUrl"
        :href="fileUrl"
        target="_blank"
    >Download File</a>
  </div>
</template>
