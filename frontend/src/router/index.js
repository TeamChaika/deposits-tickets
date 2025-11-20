import { createRouter, createWebHistory } from "vue-router";

import ForgotPasswordView from "../views/ForgotPasswordView.vue";
import LoginView from "../views/LoginView.vue";
import RegisterView from "../views/RegisterView.vue";

const routes = [
  { path: "/", redirect: "/login" },
  { path: "/login", component: LoginView },
  { path: "/register", component: RegisterView },
  { path: "/forgot-password", component: ForgotPasswordView },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;

