export interface CategoryPathEntry {
  name: string
  fullPath: string
  parentPath: string | null
  depth: number
}

export function parseCategoryPath(value: string) {
  const segments = value
    .split('|')
    .map((segment) => segment.trim().replace(/\s+/g, ' '))
    .filter(Boolean)

  return segments.length > 0 ? segments : null
}

export function buildCategoryPathEntries(
  segments: readonly string[],
): CategoryPathEntry[] {
  return segments.map((name, index) => ({
    name,
    fullPath: segments.slice(0, index + 1).join(' | '),
    parentPath:
      index === 0 ? null : segments.slice(0, index).join(' | '),
    depth: index + 1,
  }))
}
