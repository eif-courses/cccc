<script setup>
const file = ref(null)
const message = ref('')

const uploadFile = async () => {
  if (!file.value) {
    message.value = 'Please select a ZIP file.'
    return
  }

  const formData = new FormData()
  formData.append('file', file.value)

  const group = 'PIT22'

  try {
    const response = await fetch(`/api/students/upload/${group}`, {
      method: 'POST',
      body: formData
    })

    const result = await response.json()
    message.value = result.message
  }
  catch (error) {
    message.value = 'Upload failed!'
    console.error(error)
  }
}
</script>

<template>
  <div class="p-4 border rounded-lg shadow-md max-w-md mx-auto">
    <h2 class="text-lg font-bold mb-2">
      Upload ZIP File
    </h2>
    <input
      type="file"
      accept=".zip"
      class="mb-2"
      @change="e => file = e.target.files[0]"
    >
    <button
      class="px-4 py-2 bg-blue-500 text-white rounded"
      @click="uploadFile"
    >
      Upload
    </button>
    <p
      v-if="message"
      class="mt-2 text-green-500"
    >
      {{ message }}
    </p>
  </div>
</template>
