<script setup>
import { ref } from "vue";
import { useAuthStore } from "../stores/auth";

const store = useAuthStore();

const email = ref("");
const resetToken = ref("");
const newPassword = ref("");

const handleRequest = () =>
  store.requestPasswordReset({
    email: email.value,
  });

const handleReset = () =>
  store.resetPassword({
    recovery_token: resetToken.value,
    new_password: newPassword.value,
  });
</script>

<template>
  <section class="card">
    <h2>Забыл пароль</h2>

    <form @submit.prevent="handleRequest">
      <label>
        Email
        <input v-model="email" type="email" placeholder="user@example.com" required />
      </label>
      <button :disabled="store.loading" type="submit">
        {{ store.loading ? "..." : "Отправить письмо" }}
      </button>
    </form>

    <hr />

    <form @submit.prevent="handleReset">
      <label>
        Токен восстановления
        <input v-model="resetToken" type="text" placeholder="token" required />
      </label>
      <label>
        Новый пароль
        <input v-model="newPassword" type="password" placeholder="********" required />
      </label>
      <button :disabled="store.loading" type="submit">
        {{ store.loading ? "..." : "Сбросить пароль" }}
      </button>
    </form>

    <p v-if="store.statusMessage" class="status success">{{ store.statusMessage }}</p>
    <p v-if="store.errorMessage" class="status error">{{ store.errorMessage }}</p>
  </section>
</template>

<style scoped>
.card {
  width: min(480px, 100%);
  padding: 2rem;
  background: #fff;
  border-radius: 1rem;
  box-shadow: 0 10px 25px rgba(15, 23, 42, 0.1);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

label {
  display: flex;
  flex-direction: column;
  font-size: 0.9rem;
  color: #475569;
}

input {
  padding: 0.65rem;
  border: 1px solid #cbd5f5;
  border-radius: 0.5rem;
}

button {
  padding: 0.75rem;
  border: none;
  border-radius: 0.5rem;
  background: #ea580c;
  color: #fff;
  cursor: pointer;
}

button:disabled {
  background: #94a3b8;
  cursor: not-allowed;
}

.status {
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
}

.success {
  background: #dcfce7;
  color: #166534;
}

.error {
  background: #fee2e2;
  color: #991b1b;
}
</style>

