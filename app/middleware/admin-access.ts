export default defineNuxtRouteMiddleware(async (to, from) => {
  const authStore = useAuthStore()

  // Initialize auth store from session if needed
  if (!authStore.isAuthenticated) {
    const { loggedIn, user } = useUserSession()
    if (loggedIn.value && user.value) {
      // Await the setUser promise to ensure roles are set before proceeding
      await authStore.setUser(user.value)
    }
  }

  // Now we can safely check access rights
  // Uncomment and modify as needed for your access control requirements

  // Check for commission or department head access
  if (!authStore.hasAdminAccess()) {
    return navigateTo('/unauthorized')
  }

  // Alternative: If you want to allow teachers as well
  /*
  if (!authStore.hasTeacherAccess() && !authStore.hasCommissionAccess() && !authStore.hasDepartmentHeadAccess()) {
    return navigateTo('/unauthorized')
  }
  */
})
