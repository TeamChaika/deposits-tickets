<script setup>
import { ref } from "vue";
import { useAuthStore } from "../stores/auth";

const store = useAuthStore();

const email = ref("");
const password = ref("");
const newPassword = ref("");
const newEmail = ref("");

const handleLogin = () =>
  store.login({
    email: email.value,
    password: password.value,
  });

const handleChangePassword = () =>
  store.changePassword({
    access_token: store.accessToken,
    new_password: newPassword.value,
  });

const handleChangeEmail = () =>
  store.changeEmail({
    access_token: store.accessToken,
    new_email: newEmail.value,
  });
</script>

<template>
  <section class="card">
    <h2>Вход</h2>
    <form @submit.prevent="handleLogin">
      <label>
        Email
        <input v-model="email" type="email" placeholder="user@example.com" required />
      </label>
      <label>
        Пароль
        <input v-model="password" type="password" placeholder="********" required />
      </label>
      <button :disabled="store.loading" type="submit">
        {{ store.loading ? "..." : "Войти" }}
      </button>
    </form>

    <p v-if="store.statusMessage" class="status success">{{ store.statusMessage }}</p>
    <p v-if="store.errorMessage" class="status error">{{ store.errorMessage }}</p>

    <div v-if="store.accessToken" class="token-box">
      <strong>Access Token:</strong>
      <code>{{ store.accessToken }}</code>
    </div>

    <hr />

    <h3>Изменить пароль</h3>
    <form @submit.prevent="handleChangePassword">
      <label>
        Новый пароль
        <input v-model="newPassword" type="password" placeholder="********" required />
      </label>
      <button :disabled="store.loading || !store.accessToken" type="submit">
        Изменить
      </button>
    </form>

    <h3>Изменить email</h3>
    <form @submit.prevent="handleChangeEmail">
      <label>
        Новый email
        <input v-model="newEmail" type="email" placeholder="new@example.com" required />
      </label>
      <button :disabled="store.loading || !store.accessToken" type="submit">
        Изменить
      </button>
    </form>
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
  background: #2563eb;
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

.token-box {
  word-break: break-all;
  background: #0f172a;
  color: #e2e8f0;
  padding: 0.75rem;
  border-radius: 0.5rem;
}
</style>

