import { defineEventHandler } from 'h3'

// Define the Country interface (should match your store interface)
interface Country {
  id: number
  code: string
  name: string
}

// Sample data based on your i18n configuration
const languages: Country[] = [
  {
    id: 1,
    code: 'en-GB',
    name: 'English'
  },
  {
    id: 2,
    code: 'lt-LT',
    name: 'Lietuvių'
  }
]

export default defineEventHandler(async (event) => {
  // You could fetch this from a database instead of hardcoding
  return languages
})
