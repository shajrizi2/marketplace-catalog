import { z } from 'zod';

export const authEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ message: 'A valid email address is required.' }));

export const loginCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, 'Login code must contain exactly 6 digits.');

export const requestLoginCodeSchema = z.object({
  email: authEmailSchema,
});

export const verifyLoginCodeSchema = z.object({
  email: authEmailSchema,
  code: loginCodeSchema,
});
