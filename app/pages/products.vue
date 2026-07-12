<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

interface ProductItem {
  id: string
  title: string
  category: string
  sku: string
  price: string
  stock: number
}

interface ProductsResponse {
  data: ProductItem[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

const page = ref(1)
const pageSize = 20
const minPrice = ref('')
const maxPrice = ref('')
const excludeOutOfStock = ref(false)
const appliedMinPrice = ref('')
const appliedMaxPrice = ref('')
const appliedExcludeOutOfStock = ref(false)
const filterError = ref('')
const requestFetch = useRequestFetch()

const { data, status, error, refresh } = await useAsyncData(
  'products-page',
  () =>
    requestFetch<ProductsResponse>('/api/products', {
      query: {
        page: page.value,
        pageSize,
        minPrice: appliedMinPrice.value || undefined,
        maxPrice: appliedMaxPrice.value || undefined,
        excludeOutOfStock: appliedExcludeOutOfStock.value || undefined,
      },
    }),
  {
    watch: [
      page,
      appliedMinPrice,
      appliedMaxPrice,
      appliedExcludeOutOfStock,
    ],
  },
)

const totalPages = computed(() => data.value?.pagination.totalPages ?? 0)

function applyFilters() {
  filterError.value = ''

  if (
    minPrice.value !== '' &&
    maxPrice.value !== '' &&
    Number(minPrice.value) > Number(maxPrice.value)
  ) {
    filterError.value = 'Minimum price cannot be greater than maximum price.'
    return
  }

  const filtersChanged =
    appliedMinPrice.value !== minPrice.value ||
    appliedMaxPrice.value !== maxPrice.value ||
    appliedExcludeOutOfStock.value !== excludeOutOfStock.value
  const pageChanged = page.value !== 1

  appliedMinPrice.value = minPrice.value
  appliedMaxPrice.value = maxPrice.value
  appliedExcludeOutOfStock.value = excludeOutOfStock.value
  page.value = 1

  if (!filtersChanged && !pageChanged) {
    refresh()
  }
}

function previousPage() {
  if (page.value > 1) {
    page.value -= 1
  }
}

function nextPage() {
  if (page.value < totalPages.value) {
    page.value += 1
  }
}
</script>

<template>
  <div class="catalog-shell">
    <CatalogNav />

    <main class="page-content">
      <header class="page-heading">
        <div>
          <h1>Products</h1>
          <p>Browse and filter products from the imported marketplace catalog.</p>
        </div>
        <span v-if="data" class="total-count">{{ data.pagination.total }} products</span>
      </header>

      <form class="filters" @submit.prevent="applyFilters">
        <label>
          <span>Minimum price</span>
          <input v-model="minPrice" type="number" min="0" step="0.01" placeholder="0.00">
        </label>
        <label>
          <span>Maximum price</span>
          <input v-model="maxPrice" type="number" min="0" step="0.01" placeholder="1000.00">
        </label>
        <label class="checkbox-field">
          <input v-model="excludeOutOfStock" type="checkbox">
          <span>Exclude out-of-stock</span>
        </label>
        <button class="primary-button" type="submit">Apply filters</button>
      </form>

      <p v-if="filterError" class="filter-error" role="alert">{{ filterError }}</p>

      <p v-if="status === 'pending'" class="state-message" role="status">
        Loading products…
      </p>

      <div v-else-if="error" class="error-state" role="alert">
        <p>Products could not be loaded.</p>
        <button type="button" @click="refresh()">Try again</button>
      </div>

      <template v-else-if="data">
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Category</th>
                <th>SKU</th>
                <th>Price</th>
                <th>Stock</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="product in data.data" :key="product.id">
                <td class="identifier">{{ product.id }}</td>
                <td><strong>{{ product.title }}</strong></td>
                <td>{{ product.category }}</td>
                <td class="sku">{{ product.sku }}</td>
                <td>{{ product.price }}</td>
                <td>
                  <span :class="['stock', { empty: product.stock === 0 }]">
                    {{ product.stock }}
                  </span>
                </td>
              </tr>
              <tr v-if="data.data.length === 0">
                <td colspan="6" class="empty-state">No products match these filters.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="pagination" aria-label="Product pagination">
          <button type="button" :disabled="page <= 1" @click="previousPage">
            Previous
          </button>
          <span>Page {{ page }} of {{ Math.max(totalPages, 1) }}</span>
          <button
            type="button"
            :disabled="totalPages === 0 || page >= totalPages"
            @click="nextPage"
          >
            Next
          </button>
        </div>
      </template>
    </main>
  </div>
</template>

<style scoped>
.catalog-shell {
  min-height: 100vh;
  background: #f8fafc;
  color: #0f172a;
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
}

.page-content {
  width: min(100% - 2rem, 80rem);
  margin: 0 auto;
  padding: 2rem 0 3rem;
}

.page-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

h1 {
  margin: 0;
  font-size: 1.75rem;
}

.page-heading p {
  margin: 0.4rem 0 0;
  color: #64748b;
}

.total-count {
  color: #475569;
  font-size: 0.875rem;
  font-weight: 600;
}

.filters {
  display: grid;
  align-items: end;
  grid-template-columns: repeat(2, minmax(10rem, 1fr)) auto auto;
  gap: 1rem;
  margin-bottom: 1.25rem;
  padding: 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  background: #fff;
}

.filters label:not(.checkbox-field) {
  display: grid;
  gap: 0.4rem;
}

.filters label span {
  color: #475569;
  font-size: 0.8rem;
  font-weight: 600;
}

.filters input[type='number'] {
  min-height: 2.5rem;
  border: 1px solid #cbd5e1;
  border-radius: 0.5rem;
  padding: 0.5rem 0.75rem;
  font: inherit;
}

.checkbox-field {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 2.5rem;
}

.checkbox-field input {
  width: 1rem;
  height: 1rem;
}

.filter-error {
  margin: -0.5rem 0 1rem;
  color: #b91c1c;
  font-size: 0.875rem;
}

.table-wrapper {
  overflow-x: auto;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  background: #fff;
}

table {
  width: 100%;
  min-width: 64rem;
  border-collapse: collapse;
}

th,
td {
  padding: 0.875rem 1rem;
  border-bottom: 1px solid #e2e8f0;
  text-align: left;
}

th {
  background: #f8fafc;
  color: #475569;
  font-size: 0.75rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

tbody tr:last-child td {
  border-bottom: 0;
}

td {
  color: #334155;
  font-size: 0.875rem;
}

.identifier {
  max-width: 12rem;
  overflow: hidden;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sku {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.stock {
  display: inline-block;
  min-width: 2rem;
  border-radius: 999px;
  padding: 0.2rem 0.5rem;
  background: #ecfdf5;
  color: #047857;
  text-align: center;
  font-weight: 700;
}

.stock.empty {
  background: #fef2f2;
  color: #b91c1c;
}

.state-message,
.error-state,
.empty-state {
  padding: 2rem;
  color: #64748b;
  text-align: center;
}

.error-state {
  border: 1px solid #fecaca;
  border-radius: 0.75rem;
  background: #fef2f2;
  color: #991b1b;
}

.error-state p {
  margin-top: 0;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1rem;
  color: #475569;
  font-size: 0.875rem;
}

button {
  min-height: 2.5rem;
  border: 1px solid #cbd5e1;
  border-radius: 0.5rem;
  padding: 0.5rem 0.875rem;
  background: #fff;
  color: #334155;
  cursor: pointer;
  font: inherit;
  font-weight: 600;
}

.primary-button {
  border-color: #2563eb;
  background: #2563eb;
  color: #fff;
}

button:hover:not(:disabled) {
  background: #f1f5f9;
}

.primary-button:hover:not(:disabled) {
  background: #1d4ed8;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

@media (max-width: 48rem) {
  .filters {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 38rem) {
  .page-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .pagination {
    justify-content: space-between;
  }
}
</style>
