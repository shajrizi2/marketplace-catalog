<script setup lang="ts">
const email = ref('')
const code = ref('')
const codeRequested = ref(false)
const isRequestingCode = ref(false)
const isVerifyingCode = ref(false)
const message = ref('')
const errorMessage = ref('')

async function requestCode() {
  errorMessage.value = ''
  message.value = ''
  isRequestingCode.value = true

  try {
    await $fetch('/api/auth/request-code', {
      method: 'POST',
      body: { email: email.value },
    })

    codeRequested.value = true
    code.value = ''
    message.value = 'Check the server console for your six-digit login code.'
  } catch {
    errorMessage.value =
      'Unable to request a login code. Check the email and try again.'
  } finally {
    isRequestingCode.value = false
  }
}

async function verifyCode() {
  errorMessage.value = ''
  isVerifyingCode.value = true

  try {
    await $fetch('/api/auth/verify-code', {
      method: 'POST',
      body: {
        email: email.value,
        code: code.value,
      },
    })

    await navigateTo('/products')
  } catch {
    errorMessage.value =
      'The login code is invalid or expired. Request a new code and try again.'
  } finally {
    isVerifyingCode.value = false
  }
}
</script>

<template>
  <main class="login-page">
    <section class="login-card">
      <header>
        <p class="eyebrow">Marketplace Catalog</p>
        <h1>Sign in</h1>
        <p class="subtitle">Use the email address for your seeded account.</p>
      </header>

      <form class="login-form" @submit.prevent="requestCode">
        <label for="email">Email address</label>
        <input
          id="email"
          v-model="email"
          type="email"
          name="email"
          autocomplete="email"
          placeholder="demo@example.com"
          required
          :disabled="isRequestingCode || isVerifyingCode"
        >

        <button type="submit" :disabled="isRequestingCode || isVerifyingCode">
          {{ isRequestingCode ? 'Requesting…' : codeRequested ? 'Request new code' : 'Request code' }}
        </button>
      </form>

      <p v-if="message" class="message" role="status">{{ message }}</p>

      <form
        v-if="codeRequested"
        class="login-form code-form"
        @submit.prevent="verifyCode"
      >
        <label for="code">Login code</label>
        <input
          id="code"
          v-model="code"
          type="text"
          name="code"
          inputmode="numeric"
          autocomplete="one-time-code"
          pattern="[0-9]{6}"
          maxlength="6"
          placeholder="000000"
          required
          :disabled="isVerifyingCode"
        >

        <button type="submit" :disabled="isVerifyingCode || code.length !== 6">
          {{ isVerifyingCode ? 'Signing in…' : 'Sign in' }}
        </button>
      </form>

      <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>
    </section>
  </main>
</template>

<style scoped>
.login-page {
  display: grid;
  min-height: 100vh;
  place-items: center;
  padding: 1.5rem;
  background: #f4f6f8;
  color: #18212f;
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
}

.login-card {
  width: min(100%, 28rem);
  padding: 2rem;
  border: 1px solid #dfe4ea;
  border-radius: 0.875rem;
  background: #fff;
  box-shadow: 0 1rem 2.5rem rgb(15 23 42 / 8%);
}

.eyebrow {
  margin: 0 0 0.5rem;
  color: #2563eb;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  font-size: 1.75rem;
}

.subtitle {
  margin: 0.5rem 0 1.5rem;
  color: #64748b;
}

.login-form {
  display: grid;
  gap: 0.75rem;
}

.code-form {
  margin-top: 1.25rem;
}

label {
  font-size: 0.875rem;
  font-weight: 600;
}

input,
button {
  min-height: 2.75rem;
  border-radius: 0.5rem;
  font: inherit;
}

input {
  width: 100%;
  border: 1px solid #cbd5e1;
  padding: 0.625rem 0.75rem;
}

input:focus {
  border-color: #2563eb;
  outline: 3px solid rgb(37 99 235 / 15%);
}

button {
  border: 0;
  padding: 0.625rem 1rem;
  background: #2563eb;
  color: #fff;
  cursor: pointer;
  font-weight: 700;
}

button:hover:not(:disabled) {
  background: #1d4ed8;
}

button:disabled,
input:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.message,
.error {
  margin: 1rem 0 0;
  padding: 0.75rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
}

.message {
  background: #eff6ff;
  color: #1e40af;
}

.error {
  background: #fef2f2;
  color: #b91c1c;
}
</style>
