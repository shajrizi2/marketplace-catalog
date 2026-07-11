import 'dotenv/config'
import { createReadStream } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { importCatalog } from '../server/services/catalog-import/catalogImportService'
import { prisma } from '../server/utils/prisma'

function isRemoteUrl(value: string) {
  return value.startsWith('https://') || value.startsWith('http://')
}

async function main() {
  const feedSource = process.env.CATALOG_FEED_URL?.trim()

  if (!feedSource) {
    throw new Error('CATALOG_FEED_URL is required.')
  }

  const options = isRemoteUrl(feedSource)
    ? { sourceUrl: feedSource }
    : (() => {
        const filePath = resolve(process.cwd(), feedSource)

        return {
          sourceUrl: pathToFileURL(filePath).href,
          source: createReadStream(filePath),
        }
      })()

  console.info(`Importing catalog from ${options.sourceUrl}`)

  const stats = await importCatalog(options)

  console.info('Catalog import completed:')
  console.table(stats)
}

main()
  .catch((error: unknown) => {
    console.error('Catalog import failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
