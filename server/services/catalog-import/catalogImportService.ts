import { Prisma } from '../../../generated/prisma/client'
import { prisma } from '../../utils/prisma'
import {
  buildCategoryPathEntries,
  type CategoryPathEntry,
} from './categoryPath'
import { normalizeProduct } from './productNormalizer'
import { parseXmlProducts } from './xmlProductParser'

const DEFAULT_BATCH_SIZE = 500

type FeedSource = AsyncIterable<Uint8Array | string>
type CategoryDatabase = Pick<Prisma.TransactionClient, 'category'>

export interface CatalogImportOptions {
  sourceUrl: string
  source?: FeedSource
  batchSize?: number
}

export interface CatalogImportStats {
  importRunId: string
  inserted: number
  updated: number
  deleted: number
  skipped: number
}

async function* downloadFeed(sourceUrl: string): FeedSource {
  const response = await fetch(sourceUrl)

  if (!response.ok) {
    throw new Error(`Catalog download failed with status ${response.status}.`)
  }

  if (!response.body) {
    throw new Error('Catalog download returned an empty response body.')
  }

  const reader = response.body.getReader()

  try {
    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        break
      }

      yield value
    }
  } finally {
    reader.releaseLock()
  }
}

async function createCategories(
  database: CategoryDatabase,
  categories: ReadonlyMap<string, CategoryPathEntry>,
) {
  const maxDepth = Math.max(
    0,
    ...[...categories.values()].map(({ depth }) => depth),
  )

  for (let depth = 1; depth <= maxDepth; depth += 1) {
    const entries = [...categories.values()].filter(
      (entry) => entry.depth === depth,
    )
    const parentPaths = entries.flatMap(({ parentPath }) =>
      parentPath ? [parentPath] : [],
    )
    const parents = parentPaths.length
      ? await database.category.findMany({
          where: { fullPath: { in: parentPaths } },
          select: { id: true, fullPath: true },
        })
      : []
    const parentIds = new Map(
      parents.map(({ id, fullPath }) => [fullPath, id]),
    )

    await database.category.createMany({
      data: entries.map(({ name, fullPath, parentPath }) => ({
        name,
        fullPath,
        parentId: parentPath ? parentIds.get(parentPath) : undefined,
      })),
      skipDuplicates: true,
    })
  }
}

async function applyStagedProducts(
  importRunId: string,
  categories: ReadonlyMap<string, CategoryPathEntry>,
) {
  return prisma.$transaction(async (transaction) => {
    await createCategories(transaction, categories)

    const [result] = await transaction.$queryRaw<
      Array<{ inserted: number; updated: number }>
    >(Prisma.sql`
      WITH source AS (
        SELECT DISTINCT ON (staged."sku")
          staged."id",
          staged."title",
          staged."description",
          staged."categoryPath",
          staged."sku",
          staged."price",
          staged."stock"
        FROM "ProductImportRow" AS staged
        WHERE staged."importRunId" = ${importRunId}::uuid
        ORDER BY staged."sku", staged."createdAt" DESC, staged."id" DESC
      ),
      counts AS (
        SELECT
          COUNT(*) FILTER (WHERE product."id" IS NULL)::int AS inserted,
          COUNT(*) FILTER (WHERE product."id" IS NOT NULL)::int AS updated
        FROM source
        LEFT JOIN "Product" AS product ON product."sku" = source."sku"
      ),
      upserted AS (
        INSERT INTO "Product" (
          "id",
          "title",
          "description",
          "sku",
          "price",
          "stock",
          "categoryId",
          "lastSeenImportRunId",
          "createdAt",
          "updatedAt"
        )
        SELECT
          source."id",
          source."title",
          source."description",
          source."sku",
          source."price",
          source."stock",
          category."id",
          ${importRunId}::uuid,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        FROM source
        INNER JOIN "Category" AS category
          ON category."fullPath" = source."categoryPath"
        ON CONFLICT ("sku") DO UPDATE SET
          "title" = EXCLUDED."title",
          "description" = EXCLUDED."description",
          "price" = EXCLUDED."price",
          "stock" = EXCLUDED."stock",
          "categoryId" = EXCLUDED."categoryId",
          "lastSeenImportRunId" = EXCLUDED."lastSeenImportRunId",
          "updatedAt" = CURRENT_TIMESTAMP
        RETURNING 1
      )
      SELECT counts.inserted, counts.updated
      FROM counts
      CROSS JOIN (SELECT COUNT(*) FROM upserted) AS completed
    `)

    if (!result) {
      throw new Error('Catalog product upsert did not return statistics.')
    }

    const deleted = await transaction.product.deleteMany({
      where: {
        OR: [
          { lastSeenImportRunId: null },
          { lastSeenImportRunId: { not: importRunId } },
        ],
      },
    })

    await transaction.productImportRow.deleteMany({ where: { importRunId } })
    await transaction.importRun.update({
      where: { id: importRunId },
      data: { status: 'SUCCESS', finishedAt: new Date() },
    })

    return {
      inserted: result.inserted,
      updated: result.updated,
      deleted: deleted.count,
    }
  })
}

export async function importCatalog({
  sourceUrl,
  source,
  batchSize = DEFAULT_BATCH_SIZE,
}: CatalogImportOptions): Promise<CatalogImportStats> {
  if (!Number.isInteger(batchSize) || batchSize < 1) {
    throw new Error('batchSize must be a positive integer.')
  }

  const importRun = await prisma.importRun.create({
    data: { sourceUrl, status: 'RUNNING' },
    select: { id: true },
  })

  let parsedRows = 0
  let stagedRows = 0
  let skipped = 0
  let batch: Prisma.ProductImportRowCreateManyInput[] = []
  const categories = new Map<string, CategoryPathEntry>()

  try {
    const feed = source ?? downloadFeed(sourceUrl)

    for await (const xmlProduct of parseXmlProducts(feed)) {
      parsedRows += 1
      const product = normalizeProduct(xmlProduct)

      if (!product) {
        skipped += 1
        continue
      }

      for (const entry of buildCategoryPathEntries(product.categorySegments)) {
        categories.set(entry.fullPath, entry)
      }

      batch.push({
        importRunId: importRun.id,
        title: product.title,
        description: product.description,
        categoryPath: product.categoryPath,
        sku: product.sku,
        price: product.price,
        stock: product.stock,
      })

      if (batch.length >= batchSize) {
        await prisma.productImportRow.createMany({ data: batch })
        stagedRows += batch.length
        batch = []
      }
    }

    if (batch.length > 0) {
      await prisma.productImportRow.createMany({ data: batch })
      stagedRows += batch.length
    }

    //An empty feed is valid. A non empty feed where every row is malformed
    // fails safely instead of deleting the current catalog.
    if (parsedRows > 0 && stagedRows === 0) {
      throw new Error('Catalog feed contained no valid product rows.')
    }

    const result = await applyStagedProducts(importRun.id, categories)
    return { importRunId: importRun.id, ...result, skipped }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)

    await prisma.$transaction([
      prisma.productImportRow.deleteMany({ where: { importRunId: importRun.id } }),
      prisma.importRun.update({
        where: { id: importRun.id },
        data: {
          status: 'FAILED',
          finishedAt: new Date(),
          errorMessage: message.slice(0, 4000),
        },
      }),
    ])

    throw error
  }
}
