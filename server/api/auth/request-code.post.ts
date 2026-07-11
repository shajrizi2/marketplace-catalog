import { defineEventHandler, readValidatedBody } from 'h3'
import { requestLoginCodeSchema } from '../../services/auth/authValidation'
import { requestLoginCode } from '../../services/auth/passwordlessAuthService'

export default defineEventHandler(async (event) => {
  const { email } = await readValidatedBody(event, (body) =>
    requestLoginCodeSchema.parse(body),
  )

  await requestLoginCode(email)

  return {
    success: true,
    message: 'If the email is registered, a login code has been sent.',
  }
})
