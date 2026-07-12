import { createHash } from 'node:crypto'

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

export function hashLoginCode(code: string) {
  return sha256(code)
}

export function hashSessionToken(token: string) {
  return sha256(token)
}

export function isExpired(expiresAt: Date, now = new Date()) {
  return expiresAt <= now
}
