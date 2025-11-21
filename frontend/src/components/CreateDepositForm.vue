<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { useDepositStore } from "../stores/deposit";
import { useEstablishmentStore } from "../stores/establishment";
import { useEventStore } from "../stores/event";

const props = defineProps({
  deposit: {
    type: Object,
    default: null,
  },
  establishmentId: {
    type: String,
    required: true,
  },
});

const emit = defineEmits(["created", "updated", "cancel"]);

const store = useDepositStore();
const establishmentStore = useEstablishmentStore();
const eventStore = useEventStore();

const isEditMode = computed(() => !!props.deposit);

const guestName = ref("");
const guestPhone = ref("");
const guestEmail = ref("");
const amount = ref("");
const visitDate = ref("");
const visitTime = ref("");
const eventId = ref("");

const availableEvents = ref([]);

// Загрузка событий для выбора
const loadEvents = async () => {
  if (props.establishmentId) {
    await eventStore.fetchEvents(props.establishmentId);
    availableEvents.value = eventStore.events || [];
  }
};

// Загрузка данных депозита для редактирования
const loadDepositData = () => {
  if (!props.deposit) {
    // Устанавливаем значения по умолчанию для создания
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    visitDate.value = today.toISOString().split("T")[0];
    visitTime.value = "20:00";
    return;
  }

  const dep = props.deposit;
  guestName.value = dep.guest_name || "";
  guestPhone.value = dep.guest_phone || "";
  guestEmail.value = dep.guest_email || "";
  amount.value = dep.amount || "";
  
  if (dep.visit_date) {
    visitDate.value = dep.visit_date;
  }
  if (dep.visit_time) {
    visitTime.value = dep.visit_time.substring(0, 5);
  }
  
  eventId.value = dep.event_id || "";
};

onMounted(async () => {
  await loadEvents();
  loadDepositData();
});

watch(() => props.deposit, () => {
  loadDepositData();
}, { deep: true });

watch(() => props.establishmentId, async () => {
  await loadEvents();
});

const formatPhoneNumber = (event) => {
  let input = event.target.value.replace(/\D/g, "");
  
  if (input.startsWith("8") && input.length > 1) {
    input = "7" + input.substring(1);
  }

  if (input.length > 11) {
    input = input.substring(0, 11);
  }

  let formatted = "";
  if (input.length > 0) {
    formatted = "+" + input.substring(0, 1);
    if (input.length > 1) {
      formatted += input.substring(1, 4);
    }
    if (input.length > 4) {
      formatted += "-" + input.substring(4, 7);
    }
    if (input.length > 7) {
      formatted += "-" + input.substring(7, 9);
    }
    if (input.length > 9) {
      formatted += "-" + input.substring(9, 11);
    }
  }
  guestPhone.value = formatted;
};

const handleSubmit = async () => {
  // Валидация
  if (!guestName.value.trim()) {
    store.errorMessage = "Имя гостя обязательно";
    return;
  }
  
  if (!guestPhone.value.trim()) {
    store.errorMessage = "Телефон гостя обязателен";
    return;
  }
  
  if (!amount.value || parseFloat(amount.value) <= 0) {
    store.errorMessage = "Сумма должна быть больше 0";
    return;
  }
  
  if (!visitDate.value || !visitTime.value) {
    store.errorMessage = "Дата и время посещения обязательны";
    return;
  }

  const payload = {
    establishment_id: props.establishmentId,
    event_id: eventId.value || null,
    guest_name: guestName.value.trim(),
    guest_phone: guestPhone.value.trim(),
    guest_email: guestEmail.value.trim() || null,
    amount: parseFloat(amount.value),
    visit_date: visitDate.value,
    visit_time: visitTime.value,
  };

  if (isEditMode.value) {
    await store.update(props.deposit.id, payload);
    if (!store.errorMessage) {
      emit("updated");
    }
  } else {
    await store.create(payload);
    if (!store.errorMessage) {
      emit("created");
      // Сброс формы
      guestName.value = "";
      guestPhone.value = "";
      guestEmail.value = "";
      amount.value = "";
      visitDate.value = "";
      visitTime.value = "";
      eventId.value = "";
    }
  }
};
</script>

<template>
  <form @submit.prevent="handleSubmit" class="deposit-form">
    <h3>{{ isEditMode ? "Редактировать депозит" : "Создать депозит" }}</h3>

    <label>
      Имя гостя *
      <input v-model="guestName" type="text" placeholder="Иван Иванов" required />
    </label>

    <label>
      Телефон гостя *
      <input
        v-model="guestPhone"
        type="tel"
        placeholder="+7999-123-45-67"
        required
        @input="formatPhoneNumber"
      />
    </label>

    <label>
      Email гостя
      <input v-model="guestEmail" type="email" placeholder="guest@example.com" />
    </label>

    <label>
      Сумма депозита (₽) *
      <input
        v-model.number="amount"
        type="number"
        placeholder="0.00"
        min="0"
        step="0.01"
        required
      />
    </label>

    <div class="date-time-row">
      <label>
        Дата посещения *
        <input v-model="visitDate" type="date" required />
      </label>
      <label>
        Время посещения *
        <input v-model="visitTime" type="time" required />
      </label>
    </div>

    <label>
      Событие (опционально)
      <select v-model="eventId">
        <option value="">Без события</option>
        <option
          v-for="event in availableEvents"
          :key="event.id"
          :value="event.id"
        >
          {{ event.name }} ({{ event.event_date }} {{ event.event_time.substring(0, 5) }})
        </option>
      </select>
    </label>

    <div class="form-actions">
      <button type="button" @click="emit('cancel')" class="btn-secondary">
        Отмена
      </button>
      <button type="submit" :disabled="store.loading" class="btn-primary">
        {{ store.loading ? (isEditMode ? "Сохранение..." : "Создание...") : (isEditMode ? "Сохранить" : "Создать") }}
      </button>
    </div>
  </form>
</template>

<style scoped>
.deposit-form {
  background: #fff;
  border-radius: 1rem;
  padding: 2rem;
  box-shadow: 0 10px 25px rgba(15, 23, 42, 0.1);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.deposit-form h3 {
  margin: 0 0 1rem 0;
  color: #0f172a;
}

label {
  display: flex;
  flex-direction: column;
  font-size: 0.9rem;
  color: #475569;
  gap: 0.5rem;
}

input,
select {
  padding: 0.65rem;
  border: 1px solid #cbd5f5;
  border-radius: 0.5rem;
  font-size: 1rem;
}

input:focus,
select:focus {
  outline: none;
  border-color: #2563eb;
}

.date-time-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
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
</style>

