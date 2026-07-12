<script setup lang="ts">
const isLoggingOut = ref(false);

async function logout() {
  isLoggingOut.value = true;

  try {
    await $fetch('/api/auth/logout', { method: 'POST' });
  } finally {
    await navigateTo('/login');
  }
}
</script>

<template>
  <header class="catalog-header">
    <NuxtLink class="brand" to="/products">Marketplace Catalog</NuxtLink>

    <nav aria-label="Main navigation">
      <NuxtLink to="/products">Products</NuxtLink>
      <NuxtLink to="/categories">Categories</NuxtLink>
      <button type="button" :disabled="isLoggingOut" @click="logout">
        {{ isLoggingOut ? 'Logging out…' : 'Logout' }}
      </button>
    </nav>
  </header>
</template>

<style scoped>
.catalog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  padding: 1rem clamp(1rem, 4vw, 3rem);
  border-bottom: 1px solid #e2e8f0;
  background: #fff;
}

.brand {
  color: #0f172a;
  font-size: 1rem;
  font-weight: 800;
  text-decoration: none;
}

nav {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

nav a,
button {
  border-radius: 0.375rem;
  padding: 0.5rem 0.75rem;
  color: #475569;
  font: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  text-decoration: none;
}

nav a:hover,
nav a.router-link-active {
  background: #eff6ff;
  color: #1d4ed8;
}

button {
  border: 0;
  background: transparent;
  cursor: pointer;
}

button:hover:not(:disabled) {
  background: #fef2f2;
  color: #b91c1c;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

@media (max-width: 38rem) {
  .catalog-header {
    align-items: flex-start;
    flex-direction: column;
  }

  nav {
    width: 100%;
    flex-wrap: wrap;
  }
}
</style>
