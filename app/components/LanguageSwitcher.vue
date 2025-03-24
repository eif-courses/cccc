<template>
  <div>
    <UDropdown
      v-model:open="isOpen"
      :items="dropdownItems"
      :popper="{ placement: 'bottom-start' }"
    >
      <UButton
        color="white"
        icon="i-heroicons-language"
        :label="getCurrentLanguageLabel()"
        trailing-icon="i-heroicons-chevron-down-20-solid"
      />
    </UDropdown>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { locale } = useI18n()
const router = useRouter()
const isOpen = ref(false)

// Define our languages
const languages = [
  { code: 'lt-LT', name: 'Lietuvių' },
  { code: 'en-GB', name: 'English (UK)' }
]

// Get the current language label
function getCurrentLanguageLabel() {
  const current = languages.find(lang => lang.code === locale.value)
  return current ? current.name : 'Select language'
}

// Change language
function changeLanguage(code) {
  // Update locale
  locale.value = code

  // Save to localStorage
  localStorage.setItem('selectedLanguage', code)

  // Update the URL
  const currentPath = router.currentRoute.value.path
  const dashboardIndex = currentPath.indexOf('/dashboard')

  if (dashboardIndex !== -1) {
    const pathAfterDashboard = currentPath.substring(dashboardIndex)
    router.push(`/${code}${pathAfterDashboard}`)
  }
  else {
    router.push(`/${code}`)
  }
}

// Create dropdown items
const dropdownItems = computed(() => {
  return [
    languages.map(lang => ({
      label: lang.name,
      click: () => changeLanguage(lang.code),
      active: lang.code === locale.value
    }))
  ]
})

// Initialize language on mount
onMounted(() => {
  const savedLanguage = localStorage.getItem('selectedLanguage')
  if (savedLanguage && languages.some(lang => lang.code === savedLanguage)) {
    changeLanguage(savedLanguage)
  }
})
</script>
