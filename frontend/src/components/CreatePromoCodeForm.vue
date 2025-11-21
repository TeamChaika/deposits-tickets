<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { usePromoCodeStore } from "../stores/promoCode";
import { useEventStore } from "../stores/event";

const props = defineProps({
  promoCode: {
    type: Object,
    default: null,
  },
  eventId: {
    type: String,
    required: true,
  },
});

const emit = defineEmits(["created", "updated", "cancel"]);

const store = usePromoCodeStore();
const eventStore = useEventStore();

const isEditMode = computed(() => !!props.promoCode);

const code = ref("");
const promoType = ref("fixed");
const discountValue = ref("");
const startDate = ref("");
const startTime = ref("");
const endDate = ref("");
const endTime = ref("");
const maxUses = ref("");
const isActive = ref(true);

// Загрузка данных промокода для редактирования
const loadPromoCodeData = () => {
  if (!props.promoCode) {
    // Устанавливаем значения по умолчанию для создания
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    startDate.value = today.toISOString().split("T")[0];
    startTime.value = "00:00";
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    endDate.value = tomorrow.toISOString().split("T")[0];
    endTime.value = "23:59";
    return;
  }

  const pc = props.promoCode;
  code.value = pc.code || "";
  promoType.value = pc.promo_type || "fixed";
  discountValue.value = pc.discount_value || "";
  
  if (pc.start_date) {
    const start = new Date(pc.start_date);
    startDate.value = start.toISOString().split("T")[0];
    startTime.value = start.toTimeString().substring(0, 5);
  }
  
  if (pc.end_date) {
    const end = new Date(pc.end_date);
    endDate.value = end.toISOString().split("T")[0];
    endTime.value = end.toTimeString().substring(0, 5);
  }
  
  maxUses.value = pc.max_uses || "";
  isActive.value = pc.is_active !== undefined ? pc.is_active : true;
};

onMounted(() => {
  loadPromoCodeData();
});

watch(() => props.promoCode, () => {
  loadPromoCodeData();
}, { deep: true });

const handleSubmit = async () => {
  // Валидация
  if (!code.value.trim()) {
    store.errorMessage = "Код промокода обязателен";
    return;
  }
  
  if (!discountValue.value || parseFloat(discountValue.value) <= 0) {
    store.errorMessage = "Значение скидки должно быть больше 0";
    return;
  }
  
  if (promoType.value === "percentage" && parseFloat(discountValue.value) > 100) {
    store.errorMessage = "Процент скидки не может превышать 100";
    return;
  }
  
  if (!startDate.value || !startTime.value) {
    store.errorMessage = "Дата и время начала обязательны";
    return;
  }
  
  if (!endDate.value || !endTime.value) {
    store.errorMessage = "Дата и время окончания обязательны";
    return;
  }

  const startDateTime = new Date(`${startDate.value}T${startTime.value}`);
  const endDateTime = new Date(`${endDate.value}T${endTime.value}`);
  
  if (endDateTime <= startDateTime) {
    store.errorMessage = "Дата окончания должна быть позже даты начала";
    return;
  }

  const payload = {
    code: code.value.trim().toUpperCase(),
    promo_type: promoType.value,
    event_id: props.eventId,
    discount_value: parseFloat(discountValue.value),
    start_date: startDateTime.toISOString(),
    end_date: endDateTime.toISOString(),
    max_uses: maxUses.value ? parseInt(maxUses.value) : null,
    is_active: isActive.value,
  };

  if (isEditMode.value) {
    await store.update(props.promoCode.id, payload);
    if (!store.errorMessage) {
      emit("updated");
    }
  } else {
    await store.create(payload);
    if (!store.errorMessage) {
      emit("created");
      // Сброс формы
      code.value = "";
      promoType.value = "fixed";
      discountValue.value = "";
      startDate.value = "";
      startTime.value = "";
      endDate.value = "";
      endTime.value = "";
      maxUses.value = "";
      isActive.value = true;
    }
  }
};
</script>

<template>
  <form @submit.prevent="handleSubmit" class="promo-form">
    <h3>{{ isEditMode ? "Редактировать промокод" : "Создать промокод" }}</h3>

    <label>
      Код промокода *
      <input
        v-model="code"
        type="text"
        placeholder="SUMMER2024"
        required
        :readonly="isEditMode"
        style="text-transform: uppercase;"
      />
    </label>

    <label>
      Тип промокода *
      <select v-model="promoType" required>
        <option value="fixed">Фиксированная скидка (₽)</option>
        <option value="percentage">Процентная скидка (%)</option>
      </select>
    </label>

    <label>
      Значение скидки *
      <input
        v-model.number="discountValue"
        type="number"
        :min="promoType === 'percentage' ? 1 : 0.01"
        :max="promoType === 'percentage' ? 100 : undefined"
        :step="promoType === 'percentage' ? 1 : 0.01"
        :placeholder="promoType === 'percentage' ? '10' : '500'"
        required
      />
      <small>{{ promoType === 'percentage' ? 'Процент от 1 до 100' : 'Сумма в рублях' }}</small>
    </label>

    <div class="date-time-row">
      <label>
        Дата начала *
        <input v-model="startDate" type="date" required />
      </label>
      <label>
        Время начала *
        <input v-model="startTime" type="time" required />
      </label>
    </div>

    <div class="date-time-row">
      <label>
        Дата окончания *
        <input v-model="endDate" type="date" required />
      </label>
      <label>
        Время окончания *
        <input v-model="endTime" type="time" required />
      </label>
    </div>

    <label>
      Максимальное количество использований
      <input
        v-model.number="maxUses"
        type="number"
        min="1"
        placeholder="Без ограничений (оставьте пустым)"
      />
      <small>Оставьте пустым для неограниченного использования</small>
    </label>

    <label class="checkbox-label">
      <input v-model="isActive" type="checkbox" />
      <span>Активен</span>
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
.promo-form {
  background: #fff;
  border-radius: 1rem;
  padding: 2rem;
  box-shadow: 0 10px 25px rgba(15, 23, 42, 0.1);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.promo-form h3 {
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

label small {
  font-size: 0.8rem;
  color: #94a3b8;
  margin-top: 0.25rem;
}

.checkbox-label {
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
}

.checkbox-label input[type="checkbox"] {
  width: auto;
  margin: 0;
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

input[readonly] {
  background: #f8fafc;
  cursor: not-allowed;
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

