import { describe, expect, it } from 'vitest'
import { buildCategoryPathEntries, parseCategoryPath } from './categoryPath'

describe('category path helpers', () => {
  it('normalizes whitespace and empty path segments', () => {
    expect(
      parseCategoryPath('  Electronics  | Phones   and Tablets | | Smartphones  '),
    ).toEqual(['Electronics', 'Phones and Tablets', 'Smartphones'])
  })

  it('returns null for an empty category path', () => {
    expect(parseCategoryPath(' |  | ')).toBeNull()
  })

  it('builds the hierarchy and identifies the leaf entry', () => {
    const entries = buildCategoryPathEntries([
      'Electronics',
      'Phones',
      'Smartphones',
    ])

    expect(entries).toEqual([
      {
        name: 'Electronics',
        fullPath: 'Electronics',
        parentPath: null,
        depth: 1,
      },
      {
        name: 'Phones',
        fullPath: 'Electronics | Phones',
        parentPath: 'Electronics',
        depth: 2,
      },
      {
        name: 'Smartphones',
        fullPath: 'Electronics | Phones | Smartphones',
        parentPath: 'Electronics | Phones',
        depth: 3,
      },
    ])
    expect(entries.at(-1)?.name).toBe('Smartphones')
  })
})
