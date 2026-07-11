import { createError, type H3Event } from 'h3'
import { findValidSession } from '../services/auth/sessionService'
import { getSessionToken } from './authCookie'

export async function requireAuth(event: H3Event) {
  const token = getSessionToken(event)

  if (!token) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized.' })
  }

  const session = await findValidSession(token)

  if (!session) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized.' })
  }

  return session.user
}
