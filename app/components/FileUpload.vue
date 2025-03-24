<template>
  <div>
    <input
      type="file"
      accept=".csv"
      @change="uploadCSV"
    >
    <p v-if="message">
      {{ message }}
    </p>
  </div>
</template>

<script setup>
const message = ref('')

async function uploadCSV(event) {
  const file = event.target.files[0]
  if (!file) return

  const formData = new FormData()
  formData.append('file', file)

  try {
    const { data, error } = await useFetch('/api/import-csv', {
      method: 'POST',
      body: formData
      // You can add more options here, like headers if needed
    })

    // Check for errors in the response
    if (error.value) {
      throw new Error(`Error: ${error.value.message || 'Unknown error'}`)
    }

    // Check if the response contains data
    if (data.value) {
      // Display success message
      message.value = data.value.message || 'File uploaded successfully!'
    }
    else {
      message.value = 'No response data available.'
    }
  }
  catch (error) {
    console.error('Error uploading CSV:', error)
    // Display a user-friendly error message
    message.value = 'Failed to upload CSV: ' + (error.message || 'Unknown error occurred.')
  }
}
</script>
