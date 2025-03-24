export default defineNuxtPlugin(async (nuxtApp) => {
  // Get the i18n instance from the Nuxt app
  const i18n = nuxtApp.$i18n

  // Initialize the countries store
  const countriesStore = useCountriesStore()

  try {
    // Just call init() which internally calls fetchCountries() if needed
    await countriesStore.init()
  }
  catch (error) {
    console.error('Failed to initialize countries store:', error)
  }

  // Watch for changes in the selected country and update i18n locale
  // This needs to be set up at the app level, not in the store
  nuxtApp.hook('app:mounted', () => {
    // This hook runs once the app is mounted

    // Set up a watcher for the selected country
    watch(
      () => countriesStore.selectedCountry,
      (newCountry) => {
        if (newCountry && i18n) {
          i18n.locale.value = newCountry.code
        }
      },
      { immediate: true } // Apply immediately if there's already a selected country
    )
  })

  // Return something to inject into the app
  return {
    provide: {
      switchStoreLocale: (locale) => {
        // Find the country by locale code
        const country = countriesStore.findCountryByRoute(locale)
        if (country) {
          countriesStore.setSelectedCountry(country)
        }
      }
    }
  }
})
