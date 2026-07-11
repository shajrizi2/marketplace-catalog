import { defineEventHandler, getValidatedQuery } from 'h3'
import { z } from 'zod'
import { prisma } from '../utils/prisma'
import { requireAuth } from '../utils/requireAuth'

const categoriesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export default defineEventHandler(async (event) => {
  await requireAuth(event)

  const { page, pageSize } = await getValidatedQuery(event, (query) =>
    categoriesQuerySchema.parse(query),
  )

  const [categories, total] = await prisma.$transaction([
    prisma.category.findMany({
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        name: true,
        fullPath: true,
        _count: { select: { products: true } },
      },
    }),
    prisma.category.count(),
  ])

  return {
    data: categories.map(({ _count, ...category }) => ({
      ...category,
      productCount: _count.products,
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  }
})
