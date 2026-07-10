import { createHash, randomInt } from 'node:crypto'
import type { Prisma } from '../../../generated/prisma/client'
import { prisma } from '../../utils/prisma'

const LOGIN_CODE_LIFETIME_MS = 10 * 60 * 1000

type LoginCodeDatabase = Pick<Prisma.TransactionClient, 'loginCode'>

function hashLoginCode(code: string) {
  return createHash('sha256').update(code).digest('hex')
}

export async function createLoginCode(
  userId: string,
  database: LoginCodeDatabase = prisma,
) {
  const code = randomInt(0, 1_000_000).toString().padStart(6, '0')

  await database.loginCode.create({
    data: {
      userId,
      codeHash: hashLoginCode(code),
      expiresAt: new Date(Date.now() + LOGIN_CODE_LIFETIME_MS),
    },
  })

  return code
}

export async function consumeLoginCode(
  userId: string,
  code: string,
  database: LoginCodeDatabase = prisma,
) {
  const loginCode = await database.loginCode.findFirst({
    where: {
      userId,
      codeHash: hashLoginCode(code),
    },
    orderBy: { createdAt: 'desc' },
  })

  if (!loginCode) {
    throw new Error('Invalid login code.')
  }

  if (loginCode.usedAt) {
    throw new Error('Login code has already been used.')
  }

  const now = new Date()

  if (loginCode.expiresAt <= now) {
    throw new Error('Login code has expired.')
  }

  const result = await database.loginCode.updateMany({
    where: {
      id: loginCode.id,
      usedAt: null,
      expiresAt: { gt: now },
    },
    data: { usedAt: now },
  })

  if (result.count !== 1) {
    throw new Error('Login code is no longer valid.')
  }
}
