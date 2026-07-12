export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === '/login') {
    return
  }

  const requestFetch = useRequestFetch()

  try {
    await requestFetch('/api/auth/me')
  } catch {
    return navigateTo('/login')
  }
})
