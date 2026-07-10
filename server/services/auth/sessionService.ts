import { createHash, randomBytes } from 'node:crypto'
import type { Prisma } from '../../../generated/prisma/client'
import { prisma } from '../../utils/prisma'

const SESSION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000

type SessionDatabase = Pick<Prisma.TransactionClient, 'session'>

function hashSessionToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export async function createSession(
  userId: string,
  database: SessionDatabase = prisma,
) {
  const token = randomBytes(32).toString('base64url')

  const session = await database.session.create({
    data: {
      userId,
      tokenHash: hashSessionToken(token),
      expiresAt: new Date(Date.now() + SESSION_LIFETIME_MS),
    },
  })

  return { token, session }
}

export async function findValidSession(token: string) {
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: { user: true },
  })

  if (!session || session.expiresAt <= new Date()) {
    return null
  }

  return session
}

export async function deleteSession(token: string) {
  await prisma.session.deleteMany({
    where: { tokenHash: hashSessionToken(token) },
  })
}
