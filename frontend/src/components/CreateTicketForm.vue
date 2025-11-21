<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { useTicketStore } from "../stores/ticket";
import { useEventStore } from "../stores/event";
import { usePromoCodeStore } from "../stores/promoCode";

const props = defineProps({
  ticket: {
    type: Object,
    default: null,
  },
  eventId: {
    type: String,
    required: true,
  },
});

const emit = defineEmits(["created", "updated", "cancel"]);

const store = useTicketStore();
const eventStore = useEventStore();
const promoCodeStore = usePromoCodeStore();

const isEditMode = computed(() => !!props.ticket);

const guestCount = ref(1);
const firstName = ref("");
const lastName = ref("");
const phone = ref("");
const email = ref("");
const tableNumber = ref("");
const comment = ref("");
const promoCode = ref("");
const promoCodeId = ref(null);
const ticketPrice = ref("");
const discount = ref(0);
const selectedTicketType = ref("");

const currentEvent = ref(null);
const availablePromoCodes = ref([]);

// Загрузка события и его типов билетов
const loadEvent = async () => {
  await eventStore.fetchEventById(props.eventId);
  currentEvent.value = eventStore.currentEvent;
};

// Загрузка промокодов для события
const loadPromoCodes = async () => {
  await promoCodeStore.fetchPromoCodes(props.eventId);
  availablePromoCodes.value = promoCodeStore.promoCodes.filter(
    (p) => p.is_active && new Date(p.end_date) >= new Date()
  );
};

// Загрузка данных билета для редактирования
const loadTicketData = () => {
  if (!props.ticket) {
    return;
  }

  const t = props.ticket;
  guestCount.value = t.guest_count || 1;
  firstName.value = t.first_name || "";
  lastName.value = t.last_name || "";
  phone.value = t.phone || "";
  email.value = t.email || "";
  tableNumber.value = t.table_number || "";
  comment.value = t.comment || "";
  ticketPrice.value = t.price || "";
  discount.value = parseFloat(t.discount) || 0;
  promoCodeId.value = t.promo_code_id || null;
};

onMounted(async () => {
  await loadEvent();
  await loadPromoCodes();
  loadTicketData();
});

watch(() => props.ticket, () => {
  loadTicketData();
}, { deep: true });

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
  phone.value = formatted;
};

const calculatePrice = () => {
  if (!currentEvent.value || !selectedTicketType.value || guestCount.value <= 0) {
    return 0;
  }

  const ticketType = currentEvent.value.ticket_types.find(
    (t) => t.name === selectedTicketType.value
  );

  if (!ticketType) {
    return 0;
  }

  // Цена за одного гостя * количество гостей
  return ticketType.price * guestCount.value;
};

const applyPromoCode = (totalPrice, promoCodeData) => {
  if (!promoCodeData || promoCodeData.promo_type === undefined) {
    return { discount: 0, finalPrice: totalPrice };
  }

  let discountAmount = 0;
  
  if (promoCodeData.promo_type === "fixed") {
    // Фиксированная скидка применяется к общей сумме
    discountAmount = promoCodeData.discount_value * guestCount.value;
  } else if (promoCodeData.promo_type === "percentage") {
    // Процентная скидка от общей суммы
    discountAmount = (totalPrice * promoCodeData.discount_value) / 100;
  }

  // Не даем скидку больше общей цены
  if (discountAmount > totalPrice) {
    discountAmount = totalPrice;
  }

  return {
    discount: discountAmount,
    finalPrice: totalPrice - discountAmount,
  };
};

const handlePromoCodeChange = async () => {
  if (!promoCode.value.trim() || !currentEvent.value) {
    promoCodeId.value = null;
    discount.value = 0;
    // Пересчитываем цену без промокода
    ticketPrice.value = calculatePrice();
    return;
  }

  // Находим промокод
  const foundPromo = availablePromoCodes.value.find(
    (p) => p.code.toLowerCase() === promoCode.value.toLowerCase()
  );

  if (!foundPromo) {
    store.errorMessage = "Промокод не найден или недействителен";
    promoCodeId.value = null;
    discount.value = 0;
    ticketPrice.value = calculatePrice();
    return;
  }

  // Валидируем промокод (для цены одного билета)
  const ticketTypePrice = selectedTicketType.value
    ? currentEvent.value.ticket_types.find((t) => t.name === selectedTicketType.value)?.price || 0
    : 0;

  if (ticketTypePrice === 0) {
    store.errorMessage = "Выберите тип билета";
    return;
  }

  try {
    const validation = await promoCodeStore.validate(
      foundPromo.code,
      props.eventId,
      ticketTypePrice
    );

    if (!validation) {
      store.errorMessage = "Не удалось проверить промокод";
      promoCodeId.value = null;
      discount.value = 0;
      ticketPrice.value = calculatePrice();
      return;
    }

    if (validation.valid) {
      promoCodeId.value = validation.promo_code_id || foundPromo.id;
      
      // Рассчитываем общую цену с учетом количества гостей
      const totalPrice = calculatePrice();
      
      // Применяем промокод к общей сумме
      const result = applyPromoCode(totalPrice, foundPromo);
      discount.value = result.discount;
      ticketPrice.value = result.finalPrice;
      
      store.statusMessage = validation.message || "Промокод применен";
    } else {
      store.errorMessage = validation.message || "Промокод недействителен";
      promoCodeId.value = null;
      discount.value = 0;
      ticketPrice.value = calculatePrice();
    }
  } catch (error) {
    console.error("Promo code validation error:", error);
    store.errorMessage = error instanceof Error ? error.message : "Ошибка при проверке промокода";
    promoCodeId.value = null;
    discount.value = 0;
    ticketPrice.value = calculatePrice();
  }
};

const handleTicketTypeChange = () => {
  if (!currentEvent.value || !selectedTicketType.value) {
    return;
  }

  // Пересчитываем цену
  const totalPrice = calculatePrice();
  
  // Если есть промокод, пересчитываем скидку
  if (promoCodeId.value && promoCode.value) {
    handlePromoCodeChange();
  } else {
    ticketPrice.value = totalPrice;
    discount.value = 0;
  }
};

const handleGuestCountChange = () => {
  if (guestCount.value <= 0) {
    guestCount.value = 1;
  }

  if (!currentEvent.value || !selectedTicketType.value) {
    return;
  }

  // Пересчитываем цену
  const totalPrice = calculatePrice();
  
  // Если есть промокод, пересчитываем скидку
  if (promoCodeId.value && promoCode.value) {
    handlePromoCodeChange();
  } else {
    ticketPrice.value = totalPrice;
    discount.value = 0;
  }
};

const handleSubmit = async () => {
  // Валидация
  if (!firstName.value.trim()) {
    store.errorMessage = "Имя обязательно";
    return;
  }
  
  if (!lastName.value.trim()) {
    store.errorMessage = "Фамилия обязательна";
    return;
  }
  
  if (!phone.value.trim()) {
    store.errorMessage = "Телефон обязателен";
    return;
  }
  
  if (!selectedTicketType.value && !isEditMode.value) {
    store.errorMessage = "Выберите тип билета";
    return;
  }
  
  if (!ticketPrice.value || parseFloat(ticketPrice.value) <= 0) {
    store.errorMessage = "Цена должна быть больше 0";
    return;
  }

  const payload = {
    event_id: props.eventId,
    promo_code_id: promoCodeId.value || null,
    guest_count: parseInt(guestCount.value),
    first_name: firstName.value.trim(),
    last_name: lastName.value.trim(),
    phone: phone.value.trim(),
    email: email.value.trim() || null,
    table_number: tableNumber.value.trim() || null,
    comment: comment.value.trim() || null,
    price: parseFloat(ticketPrice.value),
    discount: parseFloat(discount.value) || 0,
  };

  if (isEditMode.value) {
    await store.update(props.ticket.id, payload);
    if (!store.errorMessage) {
      emit("updated");
    }
  } else {
    await store.create(payload);
    if (!store.errorMessage) {
      emit("created");
      // Сброс формы
      guestCount.value = 1;
      firstName.value = "";
      lastName.value = "";
      phone.value = "";
      email.value = "";
      tableNumber.value = "";
      comment.value = "";
      promoCode.value = "";
      promoCodeId.value = null;
      ticketPrice.value = "";
      discount.value = 0;
      selectedTicketType.value = "";
    }
  }
};
</script>

<template>
  <form @submit.prevent="handleSubmit" class="ticket-form">
    <h3>{{ isEditMode ? "Редактировать билет" : "Создать билет" }}</h3>

    <div v-if="currentEvent && !isEditMode" class="ticket-type-section">
      <label>
        Тип билета *
        <select v-model="selectedTicketType" @change="handleTicketTypeChange" required>
          <option value="">Выберите тип билета</option>
          <option
            v-for="ticketType in currentEvent.ticket_types"
            :key="ticketType.name"
            :value="ticketType.name"
          >
            {{ ticketType.name }} - {{ ticketType.price }} ₽
          </option>
        </select>
      </label>
    </div>

    <label>
      Количество гостей *
      <input
        v-model.number="guestCount"
        type="number"
        min="1"
        required
        @change="handleGuestCountChange"
        @input="handleGuestCountChange"
      />
    </label>

    <div class="name-row">
      <label>
        Имя *
        <input v-model="firstName" type="text" placeholder="Иван" required />
      </label>
      <label>
        Фамилия *
        <input v-model="lastName" type="text" placeholder="Иванов" required />
      </label>
    </div>

    <label>
      Телефон *
      <input
        v-model="phone"
        type="tel"
        placeholder="+7999-123-45-67"
        required
        @input="formatPhoneNumber"
      />
    </label>

    <label>
      Email
      <input v-model="email" type="email" placeholder="guest@example.com" />
    </label>

    <label>
      Номер стола
      <input v-model="tableNumber" type="text" placeholder="Стол 5" />
    </label>

    <label>
      Комментарий
      <textarea v-model="comment" placeholder="Дополнительная информация" rows="3"></textarea>
    </label>

    <div v-if="availablePromoCodes.length > 0 && !isEditMode" class="promo-section">
      <label>
        Промокод
        <div class="promo-input-row">
          <input
            v-model="promoCode"
            type="text"
            placeholder="Введите промокод"
            @blur="handlePromoCodeChange"
          />
          <button type="button" @click="handlePromoCodeChange" class="btn-apply">
            Применить
          </button>
        </div>
      </label>
      <div v-if="discount > 0" class="discount-info">
        <p>Скидка: {{ discount }} ₽</p>
      </div>
    </div>

    <div class="price-section">
      <label>
        Цена билета *
        <input
          v-model.number="ticketPrice"
          type="number"
          min="0"
          step="0.01"
          required
          :readonly="!isEditMode"
        />
      </label>
      <div v-if="discount > 0" class="final-price">
        <p>Итого к оплате: {{ (parseFloat(ticketPrice) || 0) - discount }} ₽</p>
      </div>
    </div>

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
.ticket-form {
  background: #fff;
  border-radius: 1rem;
  padding: 2rem;
  box-shadow: 0 10px 25px rgba(15, 23, 42, 0.1);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.ticket-form h3 {
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
select,
textarea {
  padding: 0.65rem;
  border: 1px solid #cbd5f5;
  border-radius: 0.5rem;
  font-size: 1rem;
}

input:focus,
select:focus,
textarea:focus {
  outline: none;
  border-color: #2563eb;
}

input[readonly] {
  background: #f8fafc;
  cursor: not-allowed;
}

.name-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.ticket-type-section {
  padding: 1rem;
  background: #f8fafc;
  border-radius: 0.5rem;
}

.promo-section {
  padding: 1rem;
  background: #f8fafc;
  border-radius: 0.5rem;
}

.promo-input-row {
  display: flex;
  gap: 0.5rem;
}

.promo-input-row input {
  flex: 1;
}

.btn-apply {
  padding: 0.65rem 1rem;
  border: 1px solid #2563eb;
  border-radius: 0.5rem;
  background: #fff;
  color: #2563eb;
  cursor: pointer;
  font-size: 0.9rem;
  white-space: nowrap;
}

.btn-apply:hover {
  background: #eff6ff;
}

.discount-info {
  margin-top: 0.5rem;
  padding: 0.5rem;
  background: #d1fae5;
  border-radius: 0.5rem;
  color: #065f46;
  font-size: 0.9rem;
}

.price-section {
  padding: 1rem;
  background: #f8fafc;
  border-radius: 0.5rem;
}

.final-price {
  margin-top: 0.5rem;
  padding: 0.75rem;
  background: #dbeafe;
  border-radius: 0.5rem;
}

.final-price p {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #1e40af;
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

