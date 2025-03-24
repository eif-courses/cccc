import { defineStore } from 'pinia'

interface Country {
  id: number
  code: string
  name: string
}

export const useCountriesStore = defineStore('countries', {
  state: () => ({
    countries: [] as Country[],
    selectedCountry: null as Country | null,
    isLoading: false,
    error: null as string | null
  }),

  getters: {
    currentLocale: (state) => {
      return state.selectedCountry ? state.selectedCountry.code : 'en-GB'
    }
  },

  actions: {
    async init() {
      // First load countries if they're not loaded yet
      if (this.countries.length === 0) {
        await this.fetchCountries()
      }

      // Try to get the language from localStorage
      if (import.meta.client) {
        const lastUsedLanguage = localStorage.getItem('selectedLanguage')

        if (lastUsedLanguage) {
          const country = this.countries.find(c => c.code === lastUsedLanguage)
          if (country) {
            this.setSelectedCountry(country)
            return
          }
        }
      }

      // Fall back to default language
      const defaultCountryCode = 'en-GB'
      const defaultCountry = this.countries.find(c => c.code === defaultCountryCode)

      if (defaultCountry) {
        this.setSelectedCountry(defaultCountry)
      }
      else if (this.countries.length > 0) {
        // If default not found but we have countries, use the first one
        this.setSelectedCountry(this.countries[0])
      }
    },

    async fetchCountries() {
      this.isLoading = true
      this.error = null

      try {
        // Replace fetch with $fetch which handles URLs properly in both client and server
        this.countries = await $fetch('/api/translations/languages')
      }
      catch (error: any) {
        console.error('Error fetching countries:', error)
        this.error = error.message || 'Failed to load languages'
      }
      finally {
        this.isLoading = false
      }
    },

    findCountryByRoute(route: string): Country | undefined {
      return this.countries.find(country => country.code === route)
    },

    setSelectedCountry(country: Country | null) {
      this.selectedCountry = country

      // Save to localStorage
      if (import.meta.client && country) {
        localStorage.setItem('selectedLanguage', country.code)
      }

      // Don't call useI18n() here - we'll handle locale changes elsewhere
    },

    selectCountry(route: string) {
      const country = this.findCountryByRoute(route)
      if (country) {
        this.setSelectedCountry(country)
      }
    }
  }
})
