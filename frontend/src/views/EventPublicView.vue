<script setup>
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { usePromoCodeStore } from "../stores/promoCode";
import { getEventPublic } from "../services/api";

const route = useRoute();
const router = useRouter();
const promoCodeStore = usePromoCodeStore();

const eventId = ref("");
const loading = ref(true);
const error = ref("");
const event = ref(null);

// Форма покупки билета
const selectedTicketType = ref("");
const guestCount = ref(1);
const firstName = ref("");
const lastName = ref("");
const phone = ref("");
const email = ref("");
const tableNumber = ref("");
const comment = ref("");
const promoCode = ref("");
const promoCodeId = ref(null);
const discount = ref(0);
const ticketPrice = ref(0);
const buying = ref(false);

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

const formatPrice = (price) => {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 0,
  }).format(price);
};

const calculatePrice = () => {
  if (!event.value || !selectedTicketType.value || guestCount.value <= 0) {
    return 0;
  }

  const ticketType = event.value.ticket_types.find(
    (t) => t.name === selectedTicketType.value
  );

  if (!ticketType) {
    return 0;
  }

  return ticketType.price * guestCount.value;
};

const applyPromoCode = (totalPrice, promoCodeData) => {
  if (!promoCodeData || promoCodeData.promo_type === undefined) {
    return { discount: 0, finalPrice: totalPrice };
  }

  let discountAmount = 0;
  
  if (promoCodeData.promo_type === "fixed") {
    discountAmount = promoCodeData.discount_value * guestCount.value;
  } else if (promoCodeData.promo_type === "percentage") {
    discountAmount = (totalPrice * promoCodeData.discount_value) / 100;
  }

  if (discountAmount > totalPrice) {
    discountAmount = totalPrice;
  }

  return {
    discount: discountAmount,
    finalPrice: totalPrice - discountAmount,
  };
};

const handlePromoCodeChange = async () => {
  if (!promoCode.value.trim() || !event.value) {
    promoCodeId.value = null;
    discount.value = 0;
    ticketPrice.value = calculatePrice();
    return;
  }

  const ticketTypePrice = selectedTicketType.value
    ? event.value.ticket_types.find((t) => t.name === selectedTicketType.value)?.price || 0
    : 0;

  if (ticketTypePrice === 0) {
    return;
  }

  try {
    const validation = await promoCodeStore.validate(
      promoCode.value,
      eventId.value,
      ticketTypePrice
    );

    if (validation && validation.valid) {
      // Используем данные из ответа валидации для расчета скидки
      // Для процентной скидки нужно знать процент, для фиксированной - сумму
      // Пока используем упрощенный расчет на основе discount_amount из ответа
      promoCodeId.value = validation.promo_code_id;
      const totalPrice = calculatePrice();
      
      // Если это процентная скидка, нужно пересчитать для общей суммы
      // Для фиксированной - умножаем на количество гостей
      // Пока используем простой подход: применяем скидку пропорционально
      const discountPerTicket = validation.discount_amount;
      const totalDiscount = discountPerTicket * guestCount.value;
      
      // Ограничиваем скидку общей суммой
      discount.value = totalDiscount > totalPrice ? totalPrice : totalDiscount;
      ticketPrice.value = totalPrice - discount.value;
    } else {
      promoCodeId.value = null;
      discount.value = 0;
      ticketPrice.value = calculatePrice();
    }
  } catch (error) {
    console.error("Promo code validation error:", error);
    promoCodeId.value = null;
    discount.value = 0;
    ticketPrice.value = calculatePrice();
  }
};

const handleTicketTypeChange = () => {
  // Проверяем и корректируем количество гостей при смене типа билета
  const maxGuests = getMaxGuests();
  if (guestCount.value > maxGuests) {
    guestCount.value = maxGuests;
  }

  const totalPrice = calculatePrice();
  
  if (promoCodeId.value && promoCode.value) {
    handlePromoCodeChange();
  } else {
    ticketPrice.value = totalPrice;
    discount.value = 0;
  }
};

const getMaxGuests = () => {
  if (!event.value || !selectedTicketType.value) {
    return 1;
  }

  const ticketType = event.value.ticket_types.find(
    (t) => t.name === selectedTicketType.value
  );

  if (!ticketType) {
    return 1;
  }

  return ticketType.available || 0;
};

const handleGuestCountChange = () => {
  if (guestCount.value <= 0) {
    guestCount.value = 1;
  }

  // Проверяем максимальное количество гостей и корректируем без показа ошибки
  const maxGuests = getMaxGuests();
  if (guestCount.value > maxGuests) {
    guestCount.value = maxGuests;
  }

  if (!event.value || !selectedTicketType.value) {
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

const handleBuyTicket = async () => {
  // Валидация
  if (!selectedTicketType.value) {
    error.value = "Выберите тип билета";
    return;
  }
  
  if (!firstName.value.trim()) {
    error.value = "Имя обязательно";
    return;
  }
  
  if (!lastName.value.trim()) {
    error.value = "Фамилия обязательна";
    return;
  }
  
  if (!phone.value.trim()) {
    error.value = "Телефон обязателен";
    return;
  }
  
  if (ticketPrice.value <= 0) {
    error.value = "Цена должна быть больше 0";
    return;
  }

  buying.value = true;
  error.value = "";

  try {
    const payload = {
      event_id: eventId.value,
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

    // Для публичной покупки нужно будет создать билет через API
    // Пока просто показываем сообщение
    alert("Функция покупки билетов будет реализована после интеграции платежной системы");
    
    // await ticketStore.create(payload);
    // router.push(`/ticket-success/${ticketStore.currentTicket?.id}`);
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Ошибка при покупке билета";
  } finally {
    buying.value = false;
  }
};

onMounted(async () => {
  eventId.value = route.params.id;
  
  if (!eventId.value) {
    error.value = "Событие не найдено";
    loading.value = false;
    return;
  }

  try {
    const response = await getEventPublic(eventId.value);
    event.value = response;
    
    // Устанавливаем самый дешевый тип билета по умолчанию
    if (response.ticket_types && response.ticket_types.length > 0) {
      // Находим самый дешевый доступный тип билета
      const availableTickets = response.ticket_types.filter(t => t.available > 0);
      if (availableTickets.length > 0) {
        const cheapestTicket = availableTickets.reduce((prev, current) => 
          (prev.price < current.price) ? prev : current
        );
        selectedTicketType.value = cheapestTicket.name;
        // Пересчитываем цену
        handleTicketTypeChange();
      } else {
        // Если все билеты распроданы, выбираем первый тип
        selectedTicketType.value = response.ticket_types[0].name;
        handleTicketTypeChange();
      }
    }
    
    // Промокоды будут загружаться при необходимости (при вводе промокода)
    // Не загружаем их заранее, так как это требует аутентификации
    
    loading.value = false;
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Не удалось загрузить информацию о событии";
    loading.value = false;
  }
});
</script>

<template>
  <div class="event-public-container">
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>Загрузка...</p>
    </div>

    <div v-else-if="error" class="error-state">
      <h2>Ошибка</h2>
      <p>{{ error }}</p>
      <button @click="router.push('/')" class="btn-primary">Вернуться на главную</button>
    </div>

    <div v-else-if="event" class="event-public">
      <!-- Афиша -->
      <div v-if="event.poster_url" class="poster-section">
        <img :src="event.poster_url" :alt="event.name" class="poster-image" />
      </div>

      <!-- Основная информация -->
      <div class="event-content">
        <div class="event-header">
          <h1>{{ event.name }}</h1>
          <div class="event-meta">
            <div class="meta-item">
              <span class="meta-icon">📅</span>
              <span>{{ formatDateTime(event.event_date, event.event_time) }}</span>
            </div>
            <div v-if="event.establishments" class="meta-item">
              <span class="meta-icon">📍</span>
              <span>{{ event.establishments.name }}, {{ event.establishments.address }}</span>
            </div>
          </div>
        </div>

        <div v-if="event.description" class="event-description">
          <h2>О событии</h2>
          <p>{{ event.description }}</p>
        </div>

        <!-- Форма покупки билета -->
        <div class="ticket-purchase-section">
          <h2>Купить билет</h2>
          
          <p v-if="error" class="error-message">{{ error }}</p>

          <form @submit.prevent="handleBuyTicket" class="ticket-form">
            <div class="form-row">
              <label>
                Тип билета *
                <select v-model="selectedTicketType" @change="handleTicketTypeChange" required>
                  <option value="">Выберите тип билета</option>
                  <option
                    v-for="ticketType in event.ticket_types"
                    :key="ticketType.name"
                    :value="ticketType.name"
                    :disabled="ticketType.available <= 0"
                  >
                    {{ ticketType.name }} - {{ formatPrice(ticketType.price) }}
                    <span v-if="ticketType.available <= 0"> (Распродано)</span>
                    <span v-else> (Осталось: {{ ticketType.available }})</span>
                  </option>
                </select>
              </label>

              <label>
                Количество гостей *
                <input
                  v-model.number="guestCount"
                  type="number"
                  :min="1"
                  :max="getMaxGuests()"
                  required
                  @change="handleGuestCountChange"
                  @input="handleGuestCountChange"
                />
                <small v-if="getMaxGuests() > 0" class="guests-hint">
                  Доступно: {{ getMaxGuests() }} {{ getMaxGuests() === 1 ? 'билет' : getMaxGuests() < 5 ? 'билета' : 'билетов' }}
                </small>
              </label>
            </div>

            <div class="form-row">
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
              Номер стола (опционально)
              <input v-model="tableNumber" type="text" placeholder="Стол 5" />
            </label>

            <label>
              Комментарий
              <textarea v-model="comment" placeholder="Дополнительная информация" rows="3"></textarea>
            </label>

            <div class="promo-section">
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
                <p>Скидка: {{ formatPrice(discount) }}</p>
              </div>
            </div>

            <div class="price-summary">
              <div class="price-row">
                <span>Сумма:</span>
                <span>{{ formatPrice(calculatePrice()) }}</span>
              </div>
              <div v-if="discount > 0" class="price-row discount-row">
                <span>Скидка:</span>
                <span>-{{ formatPrice(discount) }}</span>
              </div>
              <div class="price-row total-row">
                <span>Итого к оплате:</span>
                <span>{{ formatPrice(ticketPrice) }}</span>
              </div>
            </div>

            <button type="submit" :disabled="buying || !selectedTicketType" class="btn-buy">
              {{ buying ? "Обработка..." : "Купить билет" }}
            </button>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.event-public-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem 1rem;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
  color: #fff;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error-state {
  text-align: center;
  color: #fff;
  padding: 3rem;
}

.error-state h2 {
  margin-bottom: 1rem;
}

.error-state p {
  margin-bottom: 2rem;
  font-size: 1.1rem;
}

.event-public {
  max-width: 1200px;
  margin: 0 auto;
  background: #fff;
  border-radius: 2rem;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.poster-section {
  width: 100%;
  height: 400px;
  overflow: hidden;
  background: #f1f5f9;
}

.poster-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.event-content {
  padding: 3rem;
}

.event-header {
  margin-bottom: 2rem;
  padding-bottom: 2rem;
  border-bottom: 2px solid #e2e8f0;
}

.event-header h1 {
  margin: 0 0 1.5rem 0;
  color: #0f172a;
  font-size: 2.5rem;
  font-weight: 700;
}

.event-meta {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: #475569;
  font-size: 1.1rem;
}

.meta-icon {
  font-size: 1.5rem;
}

.event-description {
  margin-bottom: 3rem;
}

.event-description h2 {
  margin: 0 0 1rem 0;
  color: #0f172a;
  font-size: 1.5rem;
}

.event-description p {
  color: #475569;
  font-size: 1.1rem;
  line-height: 1.6;
}

.ticket-purchase-section {
  background: #f8fafc;
  border-radius: 1.5rem;
  padding: 2.5rem;
}

.ticket-purchase-section h2 {
  margin: 0 0 2rem 0;
  color: #0f172a;
  font-size: 2rem;
}

.error-message {
  padding: 1rem;
  background: #fee2e2;
  color: #991b1b;
  border-radius: 0.5rem;
  margin-bottom: 1.5rem;
}

.ticket-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

label {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-size: 0.95rem;
  color: #475569;
  font-weight: 500;
}

input,
select,
textarea {
  padding: 0.75rem;
  border: 2px solid #e2e8f0;
  border-radius: 0.75rem;
  font-size: 1rem;
  transition: border-color 0.2s;
}

input:focus,
select:focus,
textarea:focus {
  outline: none;
  border-color: #667eea;
}

.guests-hint {
  color: #64748b;
  font-size: 0.85rem;
  margin-top: 0.25rem;
}

select option:disabled {
  color: #94a3b8;
}

.guests-hint {
  color: #64748b;
  font-size: 0.85rem;
  margin-top: 0.25rem;
  display: block;
}

.promo-section {
  padding: 1.5rem;
  background: #fff;
  border-radius: 1rem;
  border: 2px solid #e2e8f0;
}

.promo-input-row {
  display: flex;
  gap: 0.75rem;
}

.promo-input-row input {
  flex: 1;
}

.btn-apply {
  padding: 0.75rem 1.5rem;
  border: 2px solid #667eea;
  border-radius: 0.75rem;
  background: #fff;
  color: #667eea;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 600;
  white-space: nowrap;
  transition: all 0.2s;
}

.btn-apply:hover {
  background: #667eea;
  color: #fff;
}

.discount-info {
  margin-top: 1rem;
  padding: 1rem;
  background: #d1fae5;
  border-radius: 0.75rem;
  color: #065f46;
}

.discount-info p {
  margin: 0;
  font-weight: 600;
}

.price-summary {
  background: #fff;
  border-radius: 1rem;
  padding: 1.5rem;
  border: 2px solid #e2e8f0;
}

.price-row {
  display: flex;
  justify-content: space-between;
  padding: 0.75rem 0;
  font-size: 1.1rem;
  color: #475569;
}

.price-row:not(:last-child) {
  border-bottom: 1px solid #e2e8f0;
}

.discount-row {
  color: #059669;
  font-weight: 600;
}

.total-row {
  font-size: 1.5rem;
  font-weight: 700;
  color: #0f172a;
  margin-top: 0.5rem;
  padding-top: 1rem;
  border-top: 2px solid #e2e8f0;
}

.btn-buy {
  width: 100%;
  padding: 1.25rem;
  border: none;
  border-radius: 1rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  font-size: 1.25rem;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.btn-buy:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px rgba(102, 126, 234, 0.4);
}

.btn-buy:disabled {
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

@media (max-width: 768px) {
  .event-content {
    padding: 2rem 1.5rem;
  }

  .event-header h1 {
    font-size: 2rem;
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .poster-section {
    height: 300px;
  }
}
</style>

