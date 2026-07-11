import { defineEventHandler, getValidatedQuery } from 'h3'
import { z } from 'zod'
import type { Prisma } from '../../generated/prisma/client'
import { prisma } from '../utils/prisma'
import { requireAuth } from '../utils/requireAuth'

const productsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    minPrice: z.coerce.number().finite().nonnegative().optional(),
    maxPrice: z.coerce.number().finite().nonnegative().optional(),
    excludeOutOfStock: z
      .enum(['true', 'false'])
      .transform((value) => value === 'true')
      .optional(),
  })
  .refine(
    ({ minPrice, maxPrice }) =>
      minPrice === undefined ||
      maxPrice === undefined ||
      minPrice <= maxPrice,
    {
      message: 'minPrice must be less than or equal to maxPrice.',
      path: ['minPrice'],
    },
  )

export default defineEventHandler(async (event) => {
  await requireAuth(event)

  const query = await getValidatedQuery(event, (value) =>
    productsQuerySchema.parse(value),
  )

  const where: Prisma.ProductWhereInput = {
    price:
      query.minPrice !== undefined || query.maxPrice !== undefined
        ? { gte: query.minPrice, lte: query.maxPrice }
        : undefined,
    stock: query.excludeOutOfStock ? { gt: 0 } : undefined,
  }

  const [products, total] = await prisma.$transaction([
    prisma.product.findMany({
      where,
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      orderBy: [{ title: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        title: true,
        sku: true,
        price: true,
        stock: true,
        category: { select: { fullPath: true } },
      },
    }),
    prisma.product.count({ where }),
  ])

  return {
    data: products.map(({ category, price, ...product }) => ({
      ...product,
      category: category.fullPath,
      price: price.toString(),
    })),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    },
  }
})
