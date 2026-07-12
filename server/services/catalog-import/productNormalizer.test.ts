import { describe, expect, it } from 'vitest';
import { normalizeProduct } from './productNormalizer';
import type { XmlProduct } from './xmlProductParser';

const validProduct: XmlProduct = {
  title: '  Nova X  ',
  description: '  A useful phone.  ',
  category: ' Electronics | Phones | Smartphones ',
  sku: ' PHONE-001 ',
  price: '699.99',
  stock: '12',
};

describe('normalizeProduct', () => {
  it('normalizes a valid feed product', () => {
    const product = normalizeProduct(validProduct);

    expect(product).not.toBeNull();
    expect(product).toMatchObject({
      title: 'Nova X',
      description: 'A useful phone.',
      categoryPath: 'Electronics | Phones | Smartphones',
      categorySegments: ['Electronics', 'Phones', 'Smartphones'],
      sku: 'PHONE-001',
      stock: 12,
    });
    expect(product?.price.toString()).toBe('699.99');
  });

  it.each([
    ['title', ''],
    ['category', ' | '],
    ['sku', ''],
    ['price', '-1'],
    ['price', '10.123'],
    ['stock', '-1'],
    ['stock', '1.5'],
  ] as const)('rejects an invalid %s value', (field, value) => {
    expect(normalizeProduct({ ...validProduct, [field]: value })).toBeNull();
  });
});
