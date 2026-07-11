import {
  createError,
  defineEventHandler,
  readValidatedBody,
} from 'h3'
import { verifyLoginCodeSchema } from '../../services/auth/authValidation'
import { verifyLoginCode } from '../../services/auth/passwordlessAuthService'
import { setSessionToken } from '../../utils/authCookie'

export default defineEventHandler(async (event) => {
  const { email, code } = await readValidatedBody(event, (body) =>
    verifyLoginCodeSchema.parse(body),
  )

  try {
    const { token, session } = await verifyLoginCode(email, code)
    setSessionToken(event, token, session.expiresAt)

    return { success: true }
  } catch {
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid email or login code.',
    })
  }
})
