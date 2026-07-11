import { defineEventHandler } from 'h3'
import { requireAuth } from '../../utils/requireAuth'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  return {
    user: {
      id: user.id,
      email: user.email,
    },
  }
})
