<script setup>
import { useAuthStore } from "./stores/auth";
import { useRouter } from "vue-router";

const store = useAuthStore();
const router = useRouter();

const handleLogout = async () => {
  await store.logout();
  router.push("/login");
};
</script>

<template>
  <main class="app-shell">
    <header class="app-shell__header">
      <h1>Deposits Tickets Auth Sandbox</h1>
      <nav>
        <RouterLink v-if="!store.accessToken" to="/login">Вход</RouterLink>
        <RouterLink v-if="!store.accessToken" to="/register">Регистрация</RouterLink>
        <RouterLink v-if="!store.accessToken" to="/forgot-password">Забыл пароль</RouterLink>
        <RouterLink v-if="store.accessToken" to="/establishments">Мои заведения</RouterLink>
        <RouterLink v-if="store.accessToken" to="/events">События</RouterLink>
        <RouterLink v-if="store.accessToken" to="/deposits">Депозиты</RouterLink>
        <RouterLink v-if="store.accessToken" to="/tickets">Билеты</RouterLink>
        <RouterLink v-if="store.accessToken" to="/promo-codes">Промокоды</RouterLink>
        <button
          v-if="store.accessToken"
          @click="handleLogout"
          class="logout-btn"
          :disabled="store.loading"
        >
          {{ store.loading ? "..." : "Выйти" }}
        </button>
      </nav>
    </header>
    <section class="app-shell__body">
      <RouterView />
    </section>
  </main>
</template>

<style scoped>
.app-shell {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  min-height: 100vh;
  margin: 0;
  background: #f8fafc;
  color: #0f172a;
  display: flex;
  flex-direction: column;
}

.app-shell__header {
  background: #0f172a;
  color: #f8fafc;
  padding: 1rem 2rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
}

.app-shell__header nav {
  display: flex;
  gap: 1rem;
}

.app-shell__header a {
  color: #cbd5f5;
}

.app-shell__header a.router-link-active {
  color: #38bdf8;
  text-decoration: underline;
}

.logout-btn {
  padding: 0.5rem 1rem;
  border: 1px solid #cbd5f5;
  border-radius: 0.5rem;
  background: transparent;
  color: #cbd5f5;
  cursor: pointer;
  font-size: 1rem;
}

.logout-btn:hover:not(:disabled) {
  background: rgba(203, 213, 245, 0.1);
  color: #fff;
}

.logout-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.app-shell__body {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}
</style>

