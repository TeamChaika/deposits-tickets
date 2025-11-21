<script setup>
import { onMounted, ref, computed } from "vue";
import { usePromoCodeStore } from "../stores/promoCode";
import { useEventStore } from "../stores/event";
import { useEstablishmentStore } from "../stores/establishment";
import { useAuthStore } from "../stores/auth";
import { useRouter } from "vue-router";
import CreatePromoCodeForm from "../components/CreatePromoCodeForm.vue";

const store = usePromoCodeStore();
const eventStore = useEventStore();
const establishmentStore = useEstablishmentStore();
const authStore = useAuthStore();
const router = useRouter();

const showCreateForm = ref(false);
const editingPromoCode = ref(null);
const selectedEstablishmentId = ref(null);
const selectedEventId = ref(null);

const availableEvents = ref([]);

onMounted(async () => {
  if (!authStore.accessToken) {
    router.push("/login");
    return;
  }

  await establishmentStore.fetchEstablishments();

  if (establishmentStore.establishments.length > 0) {
    selectedEstablishmentId.value = establishmentStore.establishments[0].id;
    await loadEvents();
  }
});

const loadEvents = async () => {
  if (selectedEstablishmentId.value) {
    await eventStore.fetchEvents(selectedEstablishmentId.value);
    availableEvents.value = eventStore.events || [];
    
    if (availableEvents.value.length > 0 && !selectedEventId.value) {
      selectedEventId.value = availableEvents.value[0].id;
      await loadPromoCodes();
    }
  }
};

const loadPromoCodes = async () => {
  if (selectedEventId.value) {
    await store.fetchPromoCodes(selectedEventId.value);
  }
};

const handleEstablishmentChange = async () => {
  selectedEventId.value = null;
  await loadEvents();
};

const handleEventChange = async () => {
  await loadPromoCodes();
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleString("ru-RU");
};

const isActive = (promoCode) => {
  if (!promoCode.is_active) return false;
  const now = new Date();
  const start = new Date(promoCode.start_date);
  const end = new Date(promoCode.end_date);
  return now >= start && now <= end && (promoCode.max_uses === null || promoCode.current_uses < promoCode.max_uses);
};
</script>

<template>
  <div class="promo-codes-container">
    <div class="header">
      <h2>Промокоды</h2>
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
            {{ event.name }} ({{ event.event_date }})
          </option>
        </select>
        <button
          v-if="selectedEventId"
          @click="showCreateForm = !showCreateForm"
          class="btn-primary"
        >
          {{ showCreateForm ? "Отмена" : "+ Создать промокод" }}
        </button>
      </div>
    </div>

    <p v-if="store.statusMessage" class="status success">{{ store.statusMessage }}</p>
    <p v-if="store.errorMessage" class="status error">{{ store.errorMessage }}</p>

    <div v-if="showCreateForm || editingPromoCode" class="create-form">
      <CreatePromoCodeForm
        v-if="selectedEventId"
        :event-id="selectedEventId"
        :promo-code="editingPromoCode"
        @created="
          showCreateForm = false;
          loadPromoCodes();
        "
        @updated="
          editingPromoCode = null;
          loadPromoCodes();
        "
        @cancel="
          showCreateForm = false;
          editingPromoCode = null;
        "
      />
    </div>

    <div v-if="establishmentStore.establishments.length === 0" class="empty-state">
      <p>У вас пока нет заведений</p>
      <button @click="router.push('/establishments')" class="btn-primary">
        Перейти к заведениям
      </button>
    </div>

    <div v-else-if="!selectedEventId && availableEvents.length === 0" class="empty-state">
      <p>Выберите заведение и событие для просмотра промокодов</p>
    </div>

    <div
      v-else-if="store.loading && store.promoCodes.length === 0"
      class="loading"
    >
      Загрузка...
    </div>

    <div v-else-if="store.promoCodes.length === 0 && !showCreateForm" class="empty-state">
      <p>Промокодов пока нет</p>
      <button v-if="selectedEventId" @click="showCreateForm = true" class="btn-primary">
        Создать первый промокод
      </button>
    </div>

    <div v-else class="promo-codes-grid">
      <div
        v-for="promoCode in store.promoCodes"
        :key="promoCode.id"
        class="promo-code-card"
        :class="{ inactive: !isActive(promoCode) }"
      >
        <div class="promo-header">
          <h3>{{ promoCode.code }}</h3>
          <span :class="['status-badge', isActive(promoCode) ? 'active' : 'inactive']">
            {{ isActive(promoCode) ? "Активен" : "Неактивен" }}
          </span>
        </div>
        <div class="info">
          <p>
            <strong>Тип:</strong>
            {{ promoCode.promo_type === "fixed" ? "Фиксированная скидка" : "Процентная скидка" }}
          </p>
          <p>
            <strong>Скидка:</strong>
            {{ promoCode.promo_type === "fixed" ? `${promoCode.discount_value} ₽` : `${promoCode.discount_value}%` }}
          </p>
          <p><strong>Действует с:</strong> {{ formatDateTime(promoCode.start_date) }}</p>
          <p><strong>Действует до:</strong> {{ formatDateTime(promoCode.end_date) }}</p>
          <p>
            <strong>Использований:</strong>
            {{ promoCode.current_uses }}{{ promoCode.max_uses ? ` / ${promoCode.max_uses}` : " (без ограничений)" }}
          </p>
        </div>
        <div class="actions">
          <button
            @click="editingPromoCode = promoCode"
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
.promo-codes-container {
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

.btn-primary {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 0.5rem;
  background: #2563eb;
  color: #fff;
  cursor: pointer;
  font-size: 1rem;
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

.loading,
.empty-state {
  text-align: center;
  padding: 3rem;
  color: #64748b;
}

.empty-state {
  background: #fff;
  border-radius: 1rem;
  box-shadow: 0 10px 25px rgba(15, 23, 42, 0.1);
}

.promo-codes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
}

.promo-code-card {
  background: #fff;
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: 0 10px 25px rgba(15, 23, 42, 0.1);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.promo-code-card.inactive {
  opacity: 0.7;
  background: #f8fafc;
}

.promo-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e2e8f0;
}

.promo-header h3 {
  margin: 0;
  color: #0f172a;
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: 0.05em;
}

.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.85rem;
  font-weight: 600;
}

.status-badge.active {
  background: #d1fae5;
  color: #065f46;
}

.status-badge.inactive {
  background: #fee2e2;
  color: #991b1b;
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
}

.btn-edit:hover:not(:disabled) {
  background: #eff6ff;
}
</style>

