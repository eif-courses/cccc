import { defineStore } from 'pinia'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as null | {
      displayName: string
      email: string
      role: string
      mail?: string
      jobTitle: string | null
      isTeacher: boolean
      isDepartmentHead: boolean
      isCommision: boolean
      isStudent: boolean
      isReviewer: boolean
      isAdmin: boolean
    }
  }),
  actions: {
    // Initialize from session
    initFromSession() {
      const { user } = useUserSession()
      if (user.value) {
        this.setUser(user.value)
      }
    },

    async setUser(userData) {
      let role = 'teacher' // Default role

      // Use mail or email property (whichever is available)
      const email = userData.mail || userData.email || ''

      // Determine base role from email domain
      if (email.includes('@stud.viko.lt') || email.includes('m.gzegozevskis@eif.viko.lt')) {
        role = 'student'
      }
      else if (email.includes('@eif.viko.lt') || email.includes('@viko.lt')) {
        role = 'teacher'
      }
      else if ((email.includes('baigiamieji.onmicrosoft.com') && !email.includes('admin@baigiamieji.onmicrosoft.com')) || email.includes('m.gzegozevskis@eif.viko.lt')) {
        role = 'reviewer'
      }
      else if (email.includes('admin@baigiamieji.onmicrosoft.com')) {
        role = 'admin'
      }

      // Check if user is a department head by querying the API
      let isDepartmentHead = false

      try {
        // Call the department head check API
        const response = await $fetch('/api/users/is-department-head', {
          method: 'GET'
        })

        // Update the department head status from the response
        isDepartmentHead = response.isDepartmentHead === true
      }
      catch (error) {
        console.error('Error checking department head status:', error)
        // Default to false if there's an error
        isDepartmentHead = false
      }

      // Create the user object with all needed properties
      this.user = {
        displayName: userData.displayName,
        email: email,
        mail: email, // Ensure mail property is always set
        role: role,
        jobTitle: userData.jobTitle || null,
        isTeacher: role === 'teacher' || userData.jobTitle === 'Dėstytojas' || isDepartmentHead,
        isDepartmentHead: isDepartmentHead,
        isCommision: role === 'commision' || isDepartmentHead,
        isStudent: role === 'student',
        isReviewer: true, // role === 'reviewer'
        isAdmin: role === 'admin'
      }
    },

    hasTeacherAccess() {
      return this.user?.isTeacher === true
    },
    hasDepartmentHeadAccess() {
      return this.user?.isDepartmentHead === true
    },
    hasCommisionAccess() {
      return this.user?.isCommision === true
    },
    hasStudentAccess() {
      return this.user?.isStudent === true
    },
    hasReviewerAccess() {
      return this.user?.isReviewer === true
    },
    hasAdminAccess() {
      return this.user?.isAdmin === true
    },

    // Clear user data on logout
    clearUser() {
      this.user = null
      // Also clear session if using the session system
      const { clear } = useUserSession()
      clear()
    }
  },
  getters: {
    // Get current user
    getUser: state => state.user,

    // Check if user is authenticated
    isAuthenticated: state => !!state.user,

    // Get user's primary role
    userRole: state => state.user?.role || 'guest'
  }
})
