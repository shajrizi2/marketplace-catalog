import { describe, expect, it } from 'vitest';
import { authEmailSchema, loginCodeSchema } from './authValidation';

describe('authentication validation', () => {
  it('normalizes a valid email address', () => {
    expect(authEmailSchema.parse('  Demo@Example.COM ')).toBe(
      'demo@example.com',
    );
  });

  it('rejects invalid email addresses', () => {
    expect(authEmailSchema.safeParse('not-an-email').success).toBe(false);
  });

  it('accepts exactly six digits including a leading zero', () => {
    expect(loginCodeSchema.parse(' 012345 ')).toBe('012345');
  });

  it.each(['12345', '1234567', '12345a', '12 345', ''])(
    'rejects invalid login code %j',
    (code) => {
      expect(loginCodeSchema.safeParse(code).success).toBe(false);
    },
  );
});
