import { createRouter, createWebHistory } from "vue-router";

import ForgotPasswordView from "../views/ForgotPasswordView.vue";
import LoginView from "../views/LoginView.vue";
import RegisterView from "../views/RegisterView.vue";
import EstablishmentsView from "../views/EstablishmentsView.vue";
import EventsView from "../views/EventsView.vue";
import DepositsView from "../views/DepositsView.vue";
import PaymentView from "../views/PaymentView.vue";
import TicketsView from "../views/TicketsView.vue";
import PromoCodesView from "../views/PromoCodesView.vue";
import TicketCheckInView from "../views/TicketCheckInView.vue";
import EventPublicView from "../views/EventPublicView.vue";

const routes = [
  { path: "/", redirect: "/login" },
  { path: "/login", component: LoginView },
  { path: "/register", component: RegisterView },
  { path: "/forgot-password", component: ForgotPasswordView },
  { path: "/establishments", component: EstablishmentsView },
  { path: "/events", component: EventsView },
  { path: "/deposits", component: DepositsView },
  { path: "/tickets", component: TicketsView },
  { path: "/promo-codes", component: PromoCodesView },
  { path: "/event/:id", component: EventPublicView, name: "event-public" },
  { path: "/payment/:link", component: PaymentView, name: "payment" },
  { path: "/check-in/:qrCode", component: TicketCheckInView, name: "check-in" },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;

