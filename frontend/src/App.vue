<template>
  <main class="app-shell">
    <header class="app-shell__header">
      <h1>Deposits Tickets Auth Sandbox</h1>
      <nav>
        <RouterLink to="/login">Вход</RouterLink>
        <RouterLink to="/register">Регистрация</RouterLink>
        <RouterLink to="/forgot-password">Забыл пароль</RouterLink>
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

.app-shell__body {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}
</style>

