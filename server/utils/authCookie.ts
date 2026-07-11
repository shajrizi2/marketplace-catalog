import {
  deleteCookie,
  getCookie,
  setCookie,
  type H3Event,
} from 'h3'

const SESSION_COOKIE_NAME = 'session'

const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
}

export function getSessionToken(event: H3Event) {
  return getCookie(event, SESSION_COOKIE_NAME)
}

export function setSessionToken(
  event: H3Event,
  token: string,
  expiresAt: Date,
) {
  setCookie(event, SESSION_COOKIE_NAME, token, {
    ...sessionCookieOptions,
    expires: expiresAt,
  })
}

export function clearSessionToken(event: H3Event) {
  deleteCookie(event, SESSION_COOKIE_NAME, sessionCookieOptions)
}
