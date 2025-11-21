<script setup>
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useDepositStore } from "../stores/deposit";

const route = useRoute();
const router = useRouter();
const store = useDepositStore();

const paymentLink = ref("");
const loading = ref(true);
const error = ref("");

const formatPrice = (price) => {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 0,
  }).format(price);
};

const formatDateTime = (dateStr, timeStr) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const formattedDate = date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return timeStr ? `${formattedDate} в ${timeStr.substring(0, 5)}` : formattedDate;
};

const handlePayment = () => {
  // Здесь будет интеграция с платежной системой
  alert("Интеграция с платежной системой будет добавлена позже");
};

onMounted(async () => {
  paymentLink.value = route.params.link;
  
  if (!paymentLink.value) {
    error.value = "Ссылка для оплаты не найдена";
    loading.value = false;
    return;
  }

  try {
    await store.fetchDepositByLink(paymentLink.value);
    loading.value = false;
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Не удалось загрузить информацию о депозите";
    loading.value = false;
  }
});
</script>

<template>
  <div class="payment-container">
    <div v-if="loading" class="loading">
      <p>Загрузка...</p>
    </div>

    <div v-else-if="error || store.errorMessage" class="error-state">
      <h2>Ошибка</h2>
      <p>{{ error || store.errorMessage }}</p>
      <button @click="router.push('/')" class="btn-primary">Вернуться на главную</button>
    </div>

    <div v-else-if="store.currentDeposit" class="payment-card">
      <div class="payment-header">
        <h1>Оплата депозита</h1>
      </div>

      <div class="deposit-info">
        <div class="info-section">
          <h2>Информация о бронировании</h2>
          <div class="info-row">
            <span class="label">Имя гостя:</span>
            <span class="value">{{ store.currentDeposit.guest_name }}</span>
          </div>
          <div class="info-row">
            <span class="label">Телефон:</span>
            <span class="value">{{ store.currentDeposit.guest_phone }}</span>
          </div>
          <div v-if="store.currentDeposit.guest_email" class="info-row">
            <span class="label">Email:</span>
            <span class="value">{{ store.currentDeposit.guest_email }}</span>
          </div>
          <div class="info-row">
            <span class="label">Дата и время посещения:</span>
            <span class="value">
              {{ formatDateTime(store.currentDeposit.visit_date, store.currentDeposit.visit_time) }}
            </span>
          </div>
        </div>

        <div class="amount-section">
          <div class="amount-label">Сумма к оплате</div>
          <div class="amount-value">{{ formatPrice(store.currentDeposit.amount) }}</div>
        </div>

        <div v-if="store.currentDeposit.payment_status === 'paid'" class="status-section paid">
          <p>✅ Депозит уже оплачен</p>
          <p v-if="store.currentDeposit.paid_at" class="paid-date">
            Дата оплаты: {{ formatDateTime(store.currentDeposit.paid_at, null) }}
          </p>
        </div>

        <div v-else-if="store.currentDeposit.payment_status === 'cancelled'" class="status-section cancelled">
          <p>❌ Депозит отменен</p>
        </div>

        <div v-else-if="store.currentDeposit.payment_status === 'refunded'" class="status-section refunded">
          <p>↩️ Депозит возвращен</p>
        </div>

        <div v-else class="payment-actions">
          <button @click="handlePayment" class="btn-pay" :disabled="store.loading">
            {{ store.loading ? "Обработка..." : "Оплатить" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.payment-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.loading,
.error-state {
  text-align: center;
  color: #fff;
}

.error-state h2 {
  margin-bottom: 1rem;
}

.error-state p {
  margin-bottom: 2rem;
  font-size: 1.1rem;
}

.payment-card {
  background: #fff;
  border-radius: 1.5rem;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  max-width: 600px;
  width: 100%;
  overflow: hidden;
}

.payment-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  padding: 2rem;
  text-align: center;
}

.payment-header h1 {
  margin: 0;
  font-size: 2rem;
}

.deposit-info {
  padding: 2rem;
}

.info-section {
  margin-bottom: 2rem;
}

.info-section h2 {
  margin: 0 0 1.5rem 0;
  color: #0f172a;
  font-size: 1.5rem;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 1rem 0;
  border-bottom: 1px solid #e2e8f0;
}

.info-row:last-child {
  border-bottom: none;
}

.label {
  color: #64748b;
  font-weight: 500;
}

.value {
  color: #0f172a;
  font-weight: 600;
  text-align: right;
}

.amount-section {
  background: #f8fafc;
  border-radius: 1rem;
  padding: 2rem;
  text-align: center;
  margin: 2rem 0;
}

.amount-label {
  color: #64748b;
  font-size: 1rem;
  margin-bottom: 0.5rem;
}

.amount-value {
  color: #0f172a;
  font-size: 2.5rem;
  font-weight: 700;
}

.status-section {
  padding: 1.5rem;
  border-radius: 1rem;
  text-align: center;
  margin: 2rem 0;
}

.status-section.paid {
  background: #d1fae5;
  color: #065f46;
}

.status-section.cancelled {
  background: #fee2e2;
  color: #991b1b;
}

.status-section.refunded {
  background: #e0e7ff;
  color: #3730a3;
}

.status-section p {
  margin: 0.5rem 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.paid-date {
  font-size: 0.9rem;
  font-weight: 400;
  margin-top: 0.5rem;
}

.payment-actions {
  margin-top: 2rem;
}

.btn-pay {
  width: 100%;
  padding: 1.25rem;
  border: none;
  border-radius: 1rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  font-size: 1.25rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.btn-pay:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px rgba(102, 126, 234, 0.4);
}

.btn-pay:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 0.5rem;
  background: #fff;
  color: #667eea;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
}

.btn-primary:hover {
  background: #f8fafc;
}
</style>

