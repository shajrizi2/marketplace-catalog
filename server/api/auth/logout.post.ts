import { defineEventHandler } from 'h3'
import { deleteSession } from '../../services/auth/sessionService'
import {
  clearSessionToken,
  getSessionToken,
} from '../../utils/authCookie'

export default defineEventHandler(async (event) => {
  const token = getSessionToken(event)

  if (token) {
    await deleteSession(token)
  }

  clearSessionToken(event)

  return { success: true }
})
