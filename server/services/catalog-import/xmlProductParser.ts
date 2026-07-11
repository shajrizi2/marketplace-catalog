import { SaxesParser, type SaxesTagPlain } from 'saxes'

const PRODUCT_FIELDS = new Set([
  'title',
  'description',
  'category',
  'sku',
  'price',
  'stock',
] as const)

type ProductField =
  | 'title'
  | 'description'
  | 'category'
  | 'sku'
  | 'price'
  | 'stock'

export type XmlProduct = Record<ProductField, string>

function createEmptyProduct(): XmlProduct {
  return {
    title: '',
    description: '',
    category: '',
    sku: '',
    price: '',
    stock: '',
  }
}

export async function* parseXmlProducts(
  source: AsyncIterable<Uint8Array | string>,
): AsyncGenerator<XmlProduct> {
  let currentProduct: XmlProduct | null = null
  let currentField: ProductField | null = null
  let completedProducts: XmlProduct[] = []

  const parser = new SaxesParser({ xmlns: false })

  parser.on('opentag', (tag: SaxesTagPlain) => {
    const name = tag.name.toLowerCase()

    if (name === 'product') {
      currentProduct = createEmptyProduct()
      currentField = null
    } else if (currentProduct && PRODUCT_FIELDS.has(name as ProductField)) {
      currentField = name as ProductField
    }
  })

  const appendText = (text: string) => {
    if (currentProduct && currentField) {
      currentProduct[currentField] += text
    }
  }

  parser.on('text', appendText)
  parser.on('cdata', appendText)

  parser.on('closetag', (tag: SaxesTagPlain) => {
    const name = tag.name.toLowerCase()

    if (name === 'product' && currentProduct) {
      completedProducts.push(currentProduct)
      currentProduct = null
      currentField = null
    } else if (currentField === name) {
      currentField = null
    }
  })

  parser.on('error', (error: Error) => {
    throw error
  })

  const decoder = new TextDecoder()

  for await (const chunk of source) {
    parser.write(
      typeof chunk === 'string' ? chunk : decoder.decode(chunk, { stream: true }),
    )

    const products = completedProducts
    completedProducts = []
    yield* products
  }

  parser.write(decoder.decode())
  parser.close()
  yield* completedProducts
}
