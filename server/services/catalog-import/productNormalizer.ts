import { Prisma } from '../../../generated/prisma/client'
import { parseCategoryPath } from './categoryPath'
import type { XmlProduct } from './xmlProductParser'

export interface NormalizedProduct {
  title: string
  description: string
  categoryPath: string
  categorySegments: string[]
  sku: string
  price: Prisma.Decimal
  stock: number
}

export function normalizeProduct(
  product: XmlProduct,
): NormalizedProduct | null {
  const title = product.title.trim()
  const description = product.description.trim()
  const sku = product.sku.trim()
  const categorySegments = parseCategoryPath(product.category)
  const price = product.price.trim()
  const stock = product.stock.trim()

  if (
    !title ||
    !sku ||
    !categorySegments ||
    !/^\d{1,10}(?:\.\d{1,2})?$/.test(price) ||
    !/^\d+$/.test(stock)
  ) {
    return null
  }

  const stockValue = Number(stock)

  if (!Number.isSafeInteger(stockValue)) {
    return null
  }

  return {
    title,
    description,
    categoryPath: categorySegments.join(' | '),
    categorySegments,
    sku,
    price: new Prisma.Decimal(price),
    stock: stockValue,
  }
}
