<script setup>
import { onMounted, ref, computed, watch } from "vue";
import { useDepositStore } from "../stores/deposit";
import { useEstablishmentStore } from "../stores/establishment";
import { useEventStore } from "../stores/event";
import { useAuthStore } from "../stores/auth";
import { useRouter } from "vue-router";
import CreateDepositForm from "../components/CreateDepositForm.vue";

const store = useDepositStore();
const establishmentStore = useEstablishmentStore();
const eventStore = useEventStore();
const authStore = useAuthStore();
const router = useRouter();

const showCreateForm = ref(false);
const editingDeposit = ref(null);
const selectedEstablishmentId = ref(null);
const selectedEventId = ref(null);

onMounted(async () => {
  if (!authStore.accessToken) {
    router.push("/login");
    return;
  }

  // Загружаем заведения для выбора
  await establishmentStore.fetchEstablishments();

  // Если есть заведения, используем первое
  if (establishmentStore.establishments.length > 0) {
    selectedEstablishmentId.value = establishmentStore.establishments[0].id;
    await loadDeposits();
  }
});

const loadDeposits = async () => {
  if (selectedEstablishmentId.value) {
    await store.fetchDeposits(selectedEstablishmentId.value, selectedEventId.value || null);
  }
};

const handleEstablishmentChange = async () => {
  selectedEventId.value = null;
  await loadDeposits();
};

const handleEventChange = async () => {
  await loadDeposits();
};

const formatDateTime = (dateStr, timeStr) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const formattedDate = date.toLocaleDateString("ru-RU");
  return timeStr ? `${formattedDate} ${timeStr.substring(0, 5)}` : formattedDate;
};

const formatPrice = (price) => {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 0,
  }).format(price);
};

const getPaymentLink = (paymentLink) => {
  const baseUrl = window.location.origin;
  return `${baseUrl}/payment/${paymentLink}`;
};

const copyPaymentLink = async (paymentLink) => {
  const link = getPaymentLink(paymentLink);
  try {
    await navigator.clipboard.writeText(link);
    store.statusMessage = "Ссылка скопирована в буфер обмена";
    setTimeout(() => {
      store.statusMessage = "";
    }, 3000);
  } catch (err) {
    store.errorMessage = "Не удалось скопировать ссылку";
  }
};

const getStatusLabel = (status) => {
  const statusMap = {
    pending: "Ожидает оплаты",
    paid: "Оплачен",
    cancelled: "Отменен",
    refunded: "Возвращен",
  };
  return statusMap[status] || status;
};

const getStatusClass = (status) => {
  const classMap = {
    pending: "status-pending",
    paid: "status-paid",
    cancelled: "status-cancelled",
    refunded: "status-refunded",
  };
  return classMap[status] || "";
};

// Получаем события для выбранного заведения
const availableEvents = computed(() => {
  if (!selectedEstablishmentId.value) return [];
  return eventStore.events.filter((e) => e.establishment_id === selectedEstablishmentId.value);
});

const loadEvents = async () => {
  if (selectedEstablishmentId.value) {
    await eventStore.fetchEvents(selectedEstablishmentId.value);
  }
};

watch(selectedEstablishmentId, async () => {
  await loadEvents();
});
</script>

<template>
  <div class="deposits-container">
    <div class="header">
      <h2>Депозиты</h2>
      <div class="header-actions">
        <select
          v-model="selectedEstablishmentId"
          @change="handleEstablishmentChange"
          class="establishment-select"
        >
          <option value="">Все заведения</option>
          <option
            v-for="est in establishmentStore.establishments"
            :key="est.id"
            :value="est.id"
          >
            {{ est.name }}
          </option>
        </select>
        <select
          v-if="selectedEstablishmentId && availableEvents.length > 0"
          v-model="selectedEventId"
          @change="handleEventChange"
          class="event-select"
        >
          <option value="">Все события</option>
          <option
            v-for="event in availableEvents"
            :key="event.id"
            :value="event.id"
          >
            {{ event.name }}
          </option>
        </select>
        <button
          v-if="selectedEstablishmentId"
          @click="showCreateForm = !showCreateForm"
          class="btn-primary"
        >
          {{ showCreateForm ? "Отмена" : "+ Создать депозит" }}
        </button>
      </div>
    </div>

    <p v-if="store.statusMessage" class="status success">{{ store.statusMessage }}</p>
    <p v-if="store.errorMessage" class="status error">{{ store.errorMessage }}</p>

    <div v-if="showCreateForm || editingDeposit" class="create-form">
      <CreateDepositForm
        v-if="selectedEstablishmentId"
        :establishment-id="selectedEstablishmentId"
        :deposit="editingDeposit"
        @created="
          showCreateForm = false;
          loadDeposits();
        "
        @updated="
          editingDeposit = null;
          loadDeposits();
        "
        @cancel="
          showCreateForm = false;
          editingDeposit = null;
        "
      />
    </div>

    <div v-if="establishmentStore.establishments.length === 0" class="empty-state">
      <p>У вас пока нет заведений</p>
      <p style="margin-top: 1rem; color: #64748b;">
        Сначала создайте заведение, чтобы начать работу с депозитами
      </p>
      <button @click="router.push('/establishments')" class="btn-primary" style="margin-top: 1rem;">
        Перейти к заведениям
      </button>
    </div>

    <div v-else-if="!selectedEstablishmentId" class="empty-state">
      <p>Выберите заведение для просмотра депозитов</p>
    </div>

    <div
      v-else-if="store.loading && store.deposits.length === 0"
      class="loading"
    >
      Загрузка...
    </div>

    <div v-else-if="store.deposits.length === 0 && !showCreateForm" class="empty-state">
      <p>Депозитов пока нет</p>
      <button @click="showCreateForm = true" class="btn-primary">
        Создать первый депозит
      </button>
    </div>

    <div v-else class="deposits-grid">
      <div
        v-for="deposit in store.deposits"
        :key="deposit.id"
        class="deposit-card"
      >
        <div class="deposit-header">
          <h3>{{ deposit.guest_name }}</h3>
          <span :class="['status-badge', getStatusClass(deposit.payment_status)]">
            {{ getStatusLabel(deposit.payment_status) }}
          </span>
        </div>
        <div class="info">
          <p><strong>Телефон:</strong> {{ deposit.guest_phone }}</p>
          <p v-if="deposit.guest_email"><strong>Email:</strong> {{ deposit.guest_email }}</p>
          <p><strong>Сумма:</strong> {{ formatPrice(deposit.amount) }}</p>
          <p>
            <strong>Дата и время посещения:</strong>
            {{ formatDateTime(deposit.visit_date, deposit.visit_time) }}
          </p>
          <p v-if="deposit.paid_at">
            <strong>Оплачен:</strong>
            {{ formatDateTime(deposit.paid_at, null) }}
          </p>
        </div>
        <div class="payment-link-section">
          <p><strong>Ссылка для оплаты:</strong></p>
          <div class="link-container">
            <input
              :value="getPaymentLink(deposit.payment_link)"
              readonly
              class="link-input"
            />
            <button
              @click="copyPaymentLink(deposit.payment_link)"
              class="btn-copy"
              title="Копировать ссылку"
            >
              📋
            </button>
          </div>
        </div>
        <div class="actions">
          <button
            @click="editingDeposit = deposit"
            class="btn-edit"
            :disabled="store.loading"
          >
            Редактировать
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.deposits-container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.header h2 {
  margin: 0;
  color: #0f172a;
}

.header-actions {
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
}

.establishment-select,
.event-select {
  padding: 0.75rem 1rem;
  border: 1px solid #cbd5f5;
  border-radius: 0.5rem;
  background: #fff;
  color: #0f172a;
  font-size: 1rem;
  cursor: pointer;
}

.establishment-select:focus,
.event-select:focus {
  outline: none;
  border-color: #2563eb;
}

.btn-primary {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 0.5rem;
  background: #2563eb;
  color: #fff;
  cursor: pointer;
  font-size: 1rem;
  transition: background 0.2s;
}

.btn-primary:hover:not(:disabled) {
  background: #1d4ed8;
}

.btn-primary:disabled {
  background: #94a3b8;
  cursor: not-allowed;
}

.status {
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  margin-bottom: 1rem;
}

.success {
  background: #dcfce7;
  color: #166534;
}

.error {
  background: #fee2e2;
  color: #991b1b;
}

.create-form {
  margin-bottom: 2rem;
}

.loading {
  text-align: center;
  padding: 3rem;
  color: #64748b;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  background: #fff;
  border-radius: 1rem;
  box-shadow: 0 10px 25px rgba(15, 23, 42, 0.1);
}

.empty-state p {
  margin-bottom: 1rem;
  color: #64748b;
}

.deposits-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 1.5rem;
}

.deposit-card {
  background: #fff;
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: 0 10px 25px rgba(15, 23, 42, 0.1);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.deposit-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e2e8f0;
}

.deposit-header h3 {
  margin: 0;
  color: #0f172a;
  font-size: 1.25rem;
}

.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.85rem;
  font-weight: 600;
}

.status-pending {
  background: #fef3c7;
  color: #92400e;
}

.status-paid {
  background: #d1fae5;
  color: #065f46;
}

.status-cancelled {
  background: #fee2e2;
  color: #991b1b;
}

.status-refunded {
  background: #e0e7ff;
  color: #3730a3;
}

.info {
  flex: 1;
}

.info p {
  margin: 0.5rem 0;
  color: #475569;
  font-size: 0.9rem;
}

.info strong {
  color: #0f172a;
}

.payment-link-section {
  padding: 1rem;
  background: #f8fafc;
  border-radius: 0.5rem;
  margin-top: 0.5rem;
}

.payment-link-section p {
  margin: 0 0 0.5rem 0;
  font-size: 0.9rem;
  color: #475569;
}

.link-container {
  display: flex;
  gap: 0.5rem;
}

.link-input {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid #cbd5f5;
  border-radius: 0.5rem;
  background: #fff;
  font-size: 0.85rem;
  color: #475569;
}

.btn-copy {
  padding: 0.5rem 0.75rem;
  border: 1px solid #cbd5f5;
  border-radius: 0.5rem;
  background: #fff;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s;
}

.btn-copy:hover {
  background: #f1f5f9;
}

.actions {
  display: flex;
  gap: 0.5rem;
  margin-top: auto;
  padding-top: 1rem;
  border-top: 1px solid #e2e8f0;
}

.btn-edit {
  padding: 0.5rem 1rem;
  border: 1px solid #2563eb;
  border-radius: 0.5rem;
  background: #fff;
  color: #2563eb;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.btn-edit:hover:not(:disabled) {
  background: #eff6ff;
  border-color: #1d4ed8;
  color: #1d4ed8;
}

.btn-edit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>

