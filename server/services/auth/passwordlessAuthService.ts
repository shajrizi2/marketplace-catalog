import { prisma } from '../../utils/prisma'
import { authEmailSchema, loginCodeSchema } from './authValidation'
import { consumeLoginCode, createLoginCode } from './loginCodeService'
import { createSession } from './sessionService'

export async function requestLoginCode(emailInput: string) {
  const email = authEmailSchema.parse(emailInput)

  const user = await prisma.user.findUnique({ where: { email } })

  if (!user) {
    throw new Error('No user exists with this email address.')
  }

  const code = await createLoginCode(user.id)

  console.info(`[mock-email] Login code for ${email}: ${code}`)
}

export async function verifyLoginCode(emailInput: string, codeInput: string) {
  const email = authEmailSchema.parse(emailInput)
  const code = loginCodeSchema.parse(codeInput)

  const user = await prisma.user.findUnique({ where: { email } })

  if (!user) {
    throw new Error('Invalid email or login code.')
  }

  return prisma.$transaction(async (transaction) => {
    await consumeLoginCode(user.id, code, transaction)
    return createSession(user.id, transaction)
  })
}
