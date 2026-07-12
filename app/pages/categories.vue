<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

interface CategoryItem {
  id: string
  name: string
  fullPath: string
  productCount: number
}

interface CategoriesResponse {
  data: CategoryItem[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

const page = ref(1)
const pageSize = 20
const requestFetch = useRequestFetch()

const { data, status, error, refresh } = await useAsyncData(
  'categories-page',
  () =>
    requestFetch<CategoriesResponse>('/api/categories', {
      query: { page: page.value, pageSize },
    }),
  { watch: [page] },
)

const totalPages = computed(() => data.value?.pagination.totalPages ?? 0)

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
          <h1>Categories</h1>
          <p>Browse the category hierarchy and assigned product counts.</p>
        </div>
        <span v-if="data" class="total-count">{{ data.pagination.total }} categories</span>
      </header>

      <p v-if="status === 'pending'" class="state-message" role="status">
        Loading categories…
      </p>

      <div v-else-if="error" class="error-state" role="alert">
        <p>Categories could not be loaded.</p>
        <button type="button" @click="refresh()">Try again</button>
      </div>

      <template v-else-if="data">
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Number of products</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="category in data.data" :key="category.id">
                <td class="identifier">{{ category.id }}</td>
                <td>
                  <strong>{{ category.name }}</strong>
                  <small>{{ category.fullPath }}</small>
                </td>
                <td>{{ category.productCount }}</td>
              </tr>
              <tr v-if="data.data.length === 0">
                <td colspan="3" class="empty-state">No categories found.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="pagination" aria-label="Category pagination">
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
  width: min(100% - 2rem, 75rem);
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

.table-wrapper {
  overflow-x: auto;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  background: #fff;
}

table {
  width: 100%;
  min-width: 48rem;
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

td strong,
td small {
  display: block;
}

td small {
  margin-top: 0.2rem;
  color: #64748b;
}

.identifier {
  max-width: 15rem;
  overflow: hidden;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  text-overflow: ellipsis;
  white-space: nowrap;
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

button:hover:not(:disabled) {
  background: #f1f5f9;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
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
