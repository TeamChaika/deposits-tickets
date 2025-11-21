<script setup>
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useTicketStore } from "../stores/ticket";

const route = useRoute();
const router = useRouter();
const store = useTicketStore();

const qrCode = ref("");
const loading = ref(true);
const error = ref("");
const guestsCount = ref(1);
const checkingIn = ref(false);

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

const handleCheckIn = async () => {
  if (!qrCode.value) {
    error.value = "QR код не найден";
    return;
  }

  if (guestsCount.value <= 0) {
    error.value = "Количество гостей должно быть больше 0";
    return;
  }

  const remaining = store.currentTicket.guest_count - store.currentTicket.guests_checked_in;
  if (guestsCount.value > remaining) {
    error.value = `Можно проверить только ${remaining} гостей`;
    return;
  }

  checkingIn.value = true;
  try {
    await store.checkIn(qrCode.value, guestsCount.value);
    if (!store.errorMessage) {
      // Перезагружаем билет
      await store.fetchTicketByQR(qrCode.value);
    }
  } finally {
    checkingIn.value = false;
  }
};

onMounted(async () => {
  qrCode.value = route.params.qrCode;
  
  if (!qrCode.value) {
    error.value = "QR код не найден";
    loading.value = false;
    return;
  }

  try {
    await store.fetchTicketByQR(qrCode.value);
    loading.value = false;
    
    if (store.currentTicket) {
      const remaining = store.currentTicket.guest_count - store.currentTicket.guests_checked_in;
      guestsCount.value = Math.min(remaining, 1);
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Не удалось загрузить информацию о билете";
    loading.value = false;
  }
});
</script>

<template>
  <div class="checkin-container">
    <div v-if="loading" class="loading">
      <p>Загрузка...</p>
    </div>

    <div v-else-if="error || store.errorMessage" class="error-state">
      <h2>Ошибка</h2>
      <p>{{ error || store.errorMessage }}</p>
      <button @click="router.push('/')" class="btn-primary">Вернуться на главную</button>
    </div>

    <div v-else-if="store.currentTicket" class="checkin-card">
      <div class="checkin-header">
        <h1>Проверка билета</h1>
      </div>

      <div class="ticket-info">
        <div class="info-section">
          <h2>Информация о билете</h2>
          <div class="info-row">
            <span class="label">Гость:</span>
            <span class="value">{{ store.currentTicket.first_name }} {{ store.currentTicket.last_name }}</span>
          </div>
          <div class="info-row">
            <span class="label">Телефон:</span>
            <span class="value">{{ store.currentTicket.phone }}</span>
          </div>
          <div class="info-row">
            <span class="label">Гостей по билету:</span>
            <span class="value">{{ store.currentTicket.guest_count }}</span>
          </div>
          <div class="info-row">
            <span class="label">Уже прошли проверку:</span>
            <span class="value">{{ store.currentTicket.guests_checked_in }}</span>
          </div>
          <div class="info-row">
            <span class="label">Осталось проверить:</span>
            <span class="value highlight">
              {{ store.currentTicket.guest_count - store.currentTicket.guests_checked_in }}
            </span>
          </div>
          <div v-if="store.currentTicket.table_number" class="info-row">
            <span class="label">Стол:</span>
            <span class="value">{{ store.currentTicket.table_number }}</span>
          </div>
        </div>

        <div v-if="store.currentTicket.guest_count - store.currentTicket.guests_checked_in > 0" class="checkin-section">
          <h3>Проверка гостей</h3>
          <label>
            Количество гостей для проверки
            <input
              v-model.number="guestsCount"
              type="number"
              :min="1"
              :max="store.currentTicket.guest_count - store.currentTicket.guests_checked_in"
              class="guests-input"
            />
            <small>
              Максимум: {{ store.currentTicket.guest_count - store.currentTicket.guests_checked_in }}
            </small>
          </label>
          <button
            @click="handleCheckIn"
            class="btn-checkin"
            :disabled="checkingIn || store.loading"
          >
            {{ checkingIn || store.loading ? "Проверка..." : "Проверить" }}
          </button>
        </div>

        <div v-else class="status-section completed">
          <p>✅ Все гости по этому билету уже прошли проверку</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.checkin-container {
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

.checkin-card {
  background: #fff;
  border-radius: 1.5rem;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  max-width: 600px;
  width: 100%;
  overflow: hidden;
}

.checkin-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  padding: 2rem;
  text-align: center;
}

.checkin-header h1 {
  margin: 0;
  font-size: 2rem;
}

.ticket-info {
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

.value.highlight {
  color: #2563eb;
  font-size: 1.1rem;
}

.checkin-section {
  background: #f8fafc;
  border-radius: 1rem;
  padding: 2rem;
  margin-top: 2rem;
}

.checkin-section h3 {
  margin: 0 0 1rem 0;
  color: #0f172a;
}

.checkin-section label {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.guests-input {
  padding: 0.75rem;
  border: 1px solid #cbd5f5;
  border-radius: 0.5rem;
  font-size: 1.25rem;
  text-align: center;
}

.guests-input:focus {
  outline: none;
  border-color: #2563eb;
}

.checkin-section small {
  color: #64748b;
  font-size: 0.85rem;
}

.btn-checkin {
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

.btn-checkin:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px rgba(102, 126, 234, 0.4);
}

.btn-checkin:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.status-section {
  padding: 1.5rem;
  border-radius: 1rem;
  text-align: center;
  margin-top: 2rem;
}

.status-section.completed {
  background: #d1fae5;
  color: #065f46;
}

.status-section p {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
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

