<script setup>
import { onMounted, ref, computed } from "vue";
import { useEventStore } from "../stores/event";
import { useEstablishmentStore } from "../stores/establishment";
import { useAuthStore } from "../stores/auth";
import { useRouter, useRoute } from "vue-router";
import { RouterLink } from "vue-router";
import CreateEventForm from "../components/CreateEventForm.vue";

const store = useEventStore();
const establishmentStore = useEstablishmentStore();
const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();

const showCreateForm = ref(false);
const editingEvent = ref(null);
const selectedEstablishmentId = ref(null);

// Получаем establishment_id из query параметров
const establishmentIdFromQuery = computed(() => route.query.establishment_id);

onMounted(async () => {
  if (!authStore.accessToken) {
    router.push("/login");
    return;
  }

  // Загружаем заведения для выбора
  await establishmentStore.fetchEstablishments();

  // Если передан establishment_id в query, используем его
  if (establishmentIdFromQuery.value) {
    selectedEstablishmentId.value = establishmentIdFromQuery.value;
  } else if (establishmentStore.establishments.length > 0) {
    // Иначе используем первое заведение
    selectedEstablishmentId.value = establishmentStore.establishments[0].id;
  }

  // Загружаем события
  if (selectedEstablishmentId.value) {
    await store.fetchEvents(selectedEstablishmentId.value);
  }
});

const handleEstablishmentChange = async () => {
  if (selectedEstablishmentId.value) {
    await store.fetchEvents(selectedEstablishmentId.value);
  } else {
    store.events = [];
  }
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
</script>

<template>
  <div class="events-container">
    <div class="header">
      <h2>События</h2>
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
        <button
          v-if="selectedEstablishmentId"
          @click="showCreateForm = !showCreateForm"
          class="btn-primary"
        >
          {{ showCreateForm ? "Отмена" : "+ Добавить событие" }}
        </button>
      </div>
    </div>

    <p v-if="store.statusMessage" class="status success">{{ store.statusMessage }}</p>
    <p v-if="store.errorMessage" class="status error">{{ store.errorMessage }}</p>

    <div v-if="showCreateForm || editingEvent" class="create-form">
      <CreateEventForm
        v-if="selectedEstablishmentId"
        :establishment-id="selectedEstablishmentId"
        :event="editingEvent"
        @created="
          showCreateForm = false;
          store.fetchEvents(selectedEstablishmentId);
        "
        @updated="
          editingEvent = null;
          store.fetchEvents(selectedEstablishmentId);
        "
        @cancel="
          showCreateForm = false;
          editingEvent = null;
        "
      />
    </div>

    <div v-if="!selectedEstablishmentId" class="empty-state">
      <p>Выберите заведение для просмотра событий</p>
    </div>

    <div
      v-else-if="store.loading && store.events.length === 0"
      class="loading"
    >
      Загрузка...
    </div>

    <div v-else-if="store.events.length === 0" class="empty-state">
      <p>У выбранного заведения пока нет событий</p>
      <button @click="showCreateForm = true" class="btn-primary">
        Создать первое событие
      </button>
    </div>

    <div v-else class="events-grid">
      <div
        v-for="event in store.events"
        :key="event.id"
        class="event-card"
      >
        <div v-if="event.poster_url" class="poster">
          <img :src="event.poster_url" :alt="event.name" />
        </div>
        <h3>{{ event.name }}</h3>
        <div class="info">
          <p>
            <strong>Дата и время:</strong>
            {{ formatDateTime(event.event_date, event.event_time) }}
          </p>
          <p v-if="event.description">
            <strong>Описание:</strong> {{ event.description }}
          </p>
          <p>
            <strong>Продажи:</strong>
            {{ formatDateTime(event.start_sale_date, null) }} —
            {{ formatDateTime(event.end_sale_date, null) }}
          </p>
          <div class="ticket-types">
            <strong>Типы билетов:</strong>
            <ul>
              <li
                v-for="(ticket, index) in event.ticket_types"
                :key="index"
              >
                {{ ticket.name }}: {{ formatPrice(ticket.price) }} ({{ ticket.available }}/{{ ticket.quantity }})
              </li>
            </ul>
          </div>
        </div>
        <div class="actions">
          <RouterLink
            :to="`/event/${event.id}`"
            target="_blank"
            class="btn-view"
          >
            Перейти к событию
          </RouterLink>
          <button
            @click="editingEvent = event"
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
.events-container {
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
}

.establishment-select {
  padding: 0.75rem 1rem;
  border: 1px solid #cbd5f5;
  border-radius: 0.5rem;
  background: #fff;
  color: #0f172a;
  font-size: 1rem;
  cursor: pointer;
}

.establishment-select:focus {
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

.events-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
}

.event-card {
  background: #fff;
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: 0 10px 25px rgba(15, 23, 42, 0.1);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.poster {
  width: 100%;
  height: 200px;
  border-radius: 0.5rem;
  overflow: hidden;
  background: #f1f5f9;
}

.poster img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.event-card h3 {
  margin: 0;
  color: #0f172a;
  font-size: 1.25rem;
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

.ticket-types {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e2e8f0;
}

.ticket-types ul {
  margin: 0.5rem 0 0 0;
  padding-left: 1.5rem;
  color: #475569;
  font-size: 0.9rem;
}

.ticket-types li {
  margin: 0.25rem 0;
}

.actions {
  display: flex;
  gap: 0.5rem;
  margin-top: auto;
  padding-top: 1rem;
  border-top: 1px solid #e2e8f0;
}

.btn-view {
  padding: 0.5rem 1rem;
  border: 1px solid #10b981;
  border-radius: 0.5rem;
  background: #fff;
  color: #10b981;
  cursor: pointer;
  font-size: 0.9rem;
  text-decoration: none;
  text-align: center;
  transition: all 0.2s;
  display: inline-block;
}

.btn-view:hover {
  background: #d1fae5;
  border-color: #059669;
  color: #059669;
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
  flex: 1;
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

