<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { useEventStore } from "../stores/event";
import { useEstablishmentStore } from "../stores/establishment";
import { useAuthStore } from "../stores/auth";

const props = defineProps({
  event: {
    type: Object,
    default: null,
  },
  establishmentId: {
    type: String,
    required: true,
  },
});

const emit = defineEmits(["created", "updated", "cancel"]);

const store = useEventStore();
const establishmentStore = useEstablishmentStore();

const isEditMode = computed(() => !!props.event);

const name = ref("");
const description = ref("");
const eventDate = ref("");
const eventTime = ref("");
const posterFile = ref(null);
const posterUrl = ref("");
const posterPreview = ref("");
const isUploadingPoster = ref(false);
const startSaleDate = ref("");
const startSaleTime = ref("");
const endSaleDate = ref("");
const endSaleTime = ref("");

// Типы билетов
const ticketTypes = ref([
  { name: "", price: 0, quantity: 0, available: 0 },
]);

// Загрузка данных события для редактирования
const loadEventData = () => {
  if (!props.event) {
    // Устанавливаем значения по умолчанию для создания
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    eventDate.value = today.toISOString().split("T")[0];
    eventTime.value = "20:00";
    
    const saleStart = new Date();
    saleStart.setHours(0, 0, 0, 0);
    startSaleDate.value = saleStart.toISOString().split("T")[0];
    startSaleTime.value = "00:00";
    return;
  }

  const evt = props.event;
  name.value = evt.name || "";
  description.value = evt.description || "";
  
  // Парсим дату и время события
  if (evt.event_date) {
    eventDate.value = evt.event_date;
  }
  if (evt.event_time) {
    eventTime.value = evt.event_time.substring(0, 5); // Берем только HH:MM
  }
  
  // Парсим дату начала продаж
  if (evt.start_sale_date) {
    const startDate = new Date(evt.start_sale_date);
    startSaleDate.value = startDate.toISOString().split("T")[0];
    startSaleTime.value = startDate.toTimeString().substring(0, 5);
  }
  
  // Парсим дату конца продаж
  if (evt.end_sale_date) {
    const endDate = new Date(evt.end_sale_date);
    endSaleDate.value = endDate.toISOString().split("T")[0];
    endSaleTime.value = endDate.toTimeString().substring(0, 5);
  }
  
  posterUrl.value = evt.poster_url || "";
  posterPreview.value = evt.poster_url || "";
  posterFile.value = null;
  
  // Загружаем типы билетов
  if (evt.ticket_types && evt.ticket_types.length > 0) {
    ticketTypes.value = evt.ticket_types.map((t) => ({
      name: t.name || "",
      price: t.price || 0,
      quantity: t.quantity || 0,
      available: t.available || 0,
    }));
  }
};

onMounted(() => {
  loadEventData();
});

watch(() => props.event, () => {
  loadEventData();
}, { deep: true });

const addTicketType = () => {
  ticketTypes.value.push({ name: "", price: 0, quantity: 0, available: 0 });
};

const removeTicketType = (index) => {
  if (ticketTypes.value.length > 1) {
    ticketTypes.value.splice(index, 1);
  }
};

const handlePosterSelect = (event) => {
  const file = event.target.files[0];
  if (!file) return;
  
  // Проверяем тип файла
  if (!file.type.startsWith("image/")) {
    store.errorMessage = "Выберите изображение";
    return;
  }
  
  // Проверяем размер (10MB)
  if (file.size > 10 * 1024 * 1024) {
    store.errorMessage = "Размер файла не должен превышать 10MB";
    return;
  }
  
  posterFile.value = file;
  
  // Создаем превью
  const reader = new FileReader();
  reader.onload = (e) => {
    posterPreview.value = e.target.result;
  };
  reader.readAsDataURL(file);
};

const uploadPoster = async () => {
  if (!posterFile.value) {
    return null;
  }
  
  const authStore = useAuthStore();
  if (!authStore.accessToken) {
    throw new Error("Not authenticated");
  }
  
  isUploadingPoster.value = true;
  try {
    const formData = new FormData();
    formData.append("file", posterFile.value);
    
    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1"}/upload/event-poster`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authStore.accessToken}`,
        },
        body: formData,
      }
    );
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data?.detail ?? "Failed to upload poster");
    }
    
    return data.url;
  } finally {
    isUploadingPoster.value = false;
  }
};

const handleSubmit = async () => {
  // Валидация
  if (!name.value.trim()) {
    store.errorMessage = "Название события обязательно";
    return;
  }
  
  if (!eventDate.value || !eventTime.value) {
    store.errorMessage = "Дата и время события обязательны";
    return;
  }
  
  if (!startSaleDate.value || !startSaleTime.value) {
    store.errorMessage = "Дата начала продаж обязательна";
    return;
  }
  
  // Проверка типов билетов
  const validTicketTypes = ticketTypes.value.filter(
    (t) => t.name.trim() && t.quantity > 0 && t.price >= 0
  );
  
  if (validTicketTypes.length === 0) {
    store.errorMessage = "Добавьте хотя бы один тип билета";
    return;
  }
  
  // Проверка available <= quantity
  for (const ticket of validTicketTypes) {
    if (ticket.available > ticket.quantity) {
      store.errorMessage = `Доступное количество билетов "${ticket.name}" не может превышать общее количество`;
      return;
    }
  }

  // Загружаем афишу, если выбран новый файл
  let finalPosterUrl = posterUrl.value.trim() || null;
  if (posterFile.value) {
    try {
      finalPosterUrl = await uploadPoster();
    } catch (error) {
      store.errorMessage = error instanceof Error ? error.message : "Ошибка загрузки афиши";
      return;
    }
  }

  // Формируем даты
  const startSaleDateTime = new Date(`${startSaleDate.value}T${startSaleTime.value}`);
  let endSaleDateTime = null;
  
  if (endSaleDate.value && endSaleTime.value) {
    endSaleDateTime = new Date(`${endSaleDate.value}T${endSaleTime.value}`);
  } else {
    // По умолчанию = дата и время мероприятия
    endSaleDateTime = new Date(`${eventDate.value}T${eventTime.value}`);
  }

  const payload = {
    establishment_id: props.establishmentId,
    name: name.value.trim(),
    description: description.value.trim() || null,
    event_date: eventDate.value,
    event_time: eventTime.value,
    poster_url: finalPosterUrl,
    ticket_types: validTicketTypes.map((t) => ({
      name: t.name.trim(),
      price: parseFloat(t.price),
      quantity: parseInt(t.quantity),
      available: parseInt(t.available),
    })),
    start_sale_date: startSaleDateTime.toISOString(),
    end_sale_date: endSaleDateTime ? endSaleDateTime.toISOString() : null,
  };

  if (isEditMode.value) {
    await store.update(props.event.id, payload);
    if (!store.errorMessage) {
      emit("updated");
    }
  } else {
    await store.create(payload);
    if (!store.errorMessage) {
      emit("created");
      // Сброс формы
      name.value = "";
      description.value = "";
      eventDate.value = "";
      eventTime.value = "";
      posterFile.value = null;
      posterUrl.value = "";
      posterPreview.value = "";
      startSaleDate.value = "";
      startSaleTime.value = "";
      endSaleDate.value = "";
      endSaleTime.value = "";
      ticketTypes.value = [{ name: "", price: 0, quantity: 0, available: 0 }];
    }
  }
};
</script>

<template>
  <form @submit.prevent="handleSubmit" class="event-form">
    <h3>{{ isEditMode ? "Редактировать событие" : "Добавить событие" }}</h3>

    <label>
      Название события *
      <input v-model="name" type="text" placeholder="Название" required />
    </label>

    <label>
      Описание
      <textarea v-model="description" placeholder="Описание события" rows="3"></textarea>
    </label>

    <div class="date-time-row">
      <label>
        Дата события *
        <input v-model="eventDate" type="date" required />
      </label>
      <label>
        Время события *
        <input v-model="eventTime" type="time" required />
      </label>
    </div>

    <label>
      Афиша (фото)
      <input
        type="file"
        accept="image/*"
        @change="handlePosterSelect"
        class="file-input"
      />
      <div v-if="posterPreview" class="poster-preview">
        <img :src="posterPreview" alt="Превью афиши" />
        <button
          type="button"
          @click="
            posterFile = null;
            posterPreview = '';
            posterUrl = '';
          "
          class="btn-remove-preview"
        >
          Удалить
        </button>
      </div>
      <small v-if="!posterPreview && !isEditMode"
        >Загрузите изображение (JPG, PNG, WebP, GIF, макс. 10MB)</small
      >
    </label>

    <div class="section">
      <h4>Продажа билетов</h4>
      <div class="date-time-row">
        <label>
          Дата начала продаж *
          <input v-model="startSaleDate" type="date" required />
        </label>
        <label>
          Время начала продаж *
          <input v-model="startSaleTime" type="time" required />
        </label>
      </div>
      <div class="date-time-row">
        <label>
          Дата конца продаж
          <input v-model="endSaleDate" type="date" />
          <small>По умолчанию: дата и время мероприятия</small>
        </label>
        <label>
          Время конца продаж
          <input v-model="endSaleTime" type="time" />
        </label>
      </div>
    </div>

    <div class="section">
      <div class="ticket-types-header">
        <h4>Типы билетов *</h4>
        <button type="button" @click="addTicketType" class="btn-add">
          + Добавить тип
        </button>
      </div>
      
      <div class="ticket-types-table">
        <div class="ticket-types-header-row">
          <div class="ticket-header-name">Название</div>
          <div class="ticket-header-price">Цена (₽)</div>
          <div class="ticket-header-quantity">Всего билетов</div>
          <div class="ticket-header-available">Доступно</div>
          <div class="ticket-header-actions"></div>
        </div>
        <div
          v-for="(ticket, index) in ticketTypes"
          :key="index"
          class="ticket-type-row"
        >
          <input
            v-model="ticket.name"
            type="text"
            placeholder="Например: VIP"
            class="ticket-name"
            :title="'Название типа билета (например: VIP, Обычный, Премьер)'"
          />
          <input
            v-model.number="ticket.price"
            type="number"
            placeholder="0.00"
            min="0"
            step="0.01"
            class="ticket-price"
            :title="'Цена билета в рублях'"
          />
          <input
            v-model.number="ticket.quantity"
            type="number"
            placeholder="0"
            min="1"
            class="ticket-quantity"
            :title="'Общее количество билетов этого типа'"
          />
          <input
            v-model.number="ticket.available"
            type="number"
            placeholder="0"
            min="0"
            class="ticket-available"
            :title="'Количество доступных билетов (не может превышать общее количество)'"
          />
          <button
            type="button"
            @click="removeTicketType(index)"
            class="btn-remove"
            :disabled="ticketTypes.length === 1"
            title="Удалить тип билета"
          >
            ×
          </button>
        </div>
      </div>
    </div>

    <div class="form-actions">
      <button type="button" @click="emit('cancel')" class="btn-secondary">
        Отмена
      </button>
      <button type="submit" :disabled="store.loading || isUploadingPoster" class="btn-primary">
        {{ store.loading || isUploadingPoster
          ? (isEditMode ? "Сохранение..." : "Создание...")
          : (isEditMode ? "Сохранить" : "Создать") }}
      </button>
    </div>
  </form>
</template>

<style scoped>
.event-form {
  background: #fff;
  border-radius: 1rem;
  padding: 2rem;
  box-shadow: 0 10px 25px rgba(15, 23, 42, 0.1);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.event-form h3 {
  margin: 0 0 1rem 0;
  color: #0f172a;
}

.event-form h4 {
  margin: 0 0 0.75rem 0;
  color: #0f172a;
  font-size: 1rem;
}

label {
  display: flex;
  flex-direction: column;
  font-size: 0.9rem;
  color: #475569;
  gap: 0.5rem;
}

label small {
  font-size: 0.8rem;
  color: #94a3b8;
  margin-top: 0.25rem;
}

input,
textarea {
  padding: 0.65rem;
  border: 1px solid #cbd5f5;
  border-radius: 0.5rem;
  font-size: 1rem;
}

input:focus,
textarea:focus {
  outline: none;
  border-color: #2563eb;
}

.date-time-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.section {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e2e8f0;
}

.ticket-types-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.btn-add {
  padding: 0.5rem 1rem;
  border: 1px solid #2563eb;
  border-radius: 0.5rem;
  background: #fff;
  color: #2563eb;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.btn-add:hover {
  background: #eff6ff;
}

.ticket-types-table {
  margin-top: 0.5rem;
}

.ticket-types-header-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr auto;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  padding: 0.5rem;
  background: #f8fafc;
  border-radius: 0.5rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: #475569;
}

.ticket-header-name,
.ticket-header-price,
.ticket-header-quantity,
.ticket-header-available {
  text-align: center;
}

.ticket-header-actions {
  text-align: center;
}

.ticket-type-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr auto;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  align-items: flex-start;
}

.ticket-name {
  min-width: 0;
}

.ticket-price,
.ticket-quantity,
.ticket-available {
  min-width: 0;
  text-align: center;
}

.btn-remove {
  padding: 0.5rem 0.75rem;
  border: 1px solid #dc2626;
  border-radius: 0.5rem;
  background: #fff;
  color: #dc2626;
  cursor: pointer;
  font-size: 1.25rem;
  line-height: 1;
  transition: all 0.2s;
  flex-shrink: 0;
}

.btn-remove:hover:not(:disabled) {
  background: #fee2e2;
}

.btn-remove:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 1rem;
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

.btn-primary:hover:not(:disabled) {
  background: #1d4ed8;
}

.btn-primary:disabled {
  background: #94a3b8;
  cursor: not-allowed;
}

.btn-secondary {
  padding: 0.75rem 1.5rem;
  border: 1px solid #cbd5f5;
  border-radius: 0.5rem;
  background: #fff;
  color: #475569;
  cursor: pointer;
  font-size: 1rem;
}

.btn-secondary:hover {
  background: #f8fafc;
}

.file-input {
  padding: 0.5rem;
  border: 1px solid #cbd5f5;
  border-radius: 0.5rem;
  font-size: 0.9rem;
  cursor: pointer;
}

.file-input:hover {
  border-color: #2563eb;
}

.poster-preview {
  margin-top: 0.5rem;
  position: relative;
  width: 100%;
  max-width: 300px;
  border-radius: 0.5rem;
  overflow: hidden;
  background: #f1f5f9;
}

.poster-preview img {
  width: 100%;
  height: auto;
  display: block;
}

.btn-remove-preview {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  padding: 0.5rem;
  border: none;
  border-radius: 0.5rem;
  background: rgba(220, 38, 38, 0.9);
  color: #fff;
  cursor: pointer;
  font-size: 0.85rem;
  transition: background 0.2s;
}

.btn-remove-preview:hover {
  background: rgba(185, 28, 28, 0.95);
}
</style>

