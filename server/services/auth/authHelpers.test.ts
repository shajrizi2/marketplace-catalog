import { describe, expect, it } from 'vitest'
import { hashLoginCode, hashSessionToken, isExpired } from './authHelpers'

describe('auth helpers', () => {
  it('hashes the same login code consistently without storing the raw code', () => {
    const hash = hashLoginCode('012345')

    expect(hashLoginCode('012345')).toBe(hash)
    expect(hash).not.toContain('012345')
    expect(hash).toMatch(/^[a-f0-9]{64}$/)
  })

  it('hashes session tokens consistently and distinguishes different tokens', () => {
    expect(hashSessionToken('token-one')).toBe(hashSessionToken('token-one'))
    expect(hashSessionToken('token-one')).not.toBe(hashSessionToken('token-two'))
  })

  it('treats past and exactly-current expirations as expired', () => {
    const now = new Date('2026-07-12T12:00:00.000Z')

    expect(isExpired(new Date('2026-07-12T11:59:59.999Z'), now)).toBe(true)
    expect(isExpired(now, now)).toBe(true)
    expect(isExpired(new Date('2026-07-12T12:00:00.001Z'), now)).toBe(false)
  })
})
