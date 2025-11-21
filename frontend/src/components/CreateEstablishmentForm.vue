<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { useEstablishmentStore } from "../stores/establishment";

const props = defineProps({
  establishment: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(["created", "updated", "cancel"]);

const store = useEstablishmentStore();

const isEditMode = computed(() => !!props.establishment);

const name = ref("");
const phone = ref("");
const phoneError = ref("");
const address = ref("");
const description = ref("");

// Режим работы
const workingHours = ref({
  monday: { open_time: "09:00", close_time: "22:00", is_closed: false },
  tuesday: { open_time: "09:00", close_time: "22:00", is_closed: false },
  wednesday: { open_time: "09:00", close_time: "22:00", is_closed: false },
  thursday: { open_time: "09:00", close_time: "22:00", is_closed: false },
  friday: { open_time: "09:00", close_time: "23:00", is_closed: false },
  saturday: { open_time: "10:00", close_time: "23:00", is_closed: false },
  sunday: { open_time: "10:00", close_time: "22:00", is_closed: false },
});

// Предустановленные социальные сети
const predefinedSocialNetworks = ref({
  instagram: "",
  facebook: "",
  vk: "",
  telegram: "",
  website: "",
});

// Кастомные социальные сети
const customSocialNetworks = ref([]);

const isPhoneValid = computed(() => {
  if (!phone.value) return false;
  const cleaned = phone.value.replace(/[\s-]/g, "");
  return /^\+7\d{10}$/.test(cleaned);
});

const days = [
  { key: "monday", label: "Понедельник" },
  { key: "tuesday", label: "Вторник" },
  { key: "wednesday", label: "Среда" },
  { key: "thursday", label: "Четверг" },
  { key: "friday", label: "Пятница" },
  { key: "saturday", label: "Суббота" },
  { key: "sunday", label: "Воскресенье" },
];

// Форматирование телефона по маске +7###-###-##-##
const formatPhone = (value) => {
  // Удаляем все кроме цифр и +
  let cleaned = value.replace(/[^\d+]/g, "");
  
  // Если начинается не с +7, добавляем +7
  if (!cleaned.startsWith("+7")) {
    if (cleaned.startsWith("7")) {
      cleaned = "+" + cleaned;
    } else if (cleaned.startsWith("8")) {
      cleaned = "+7" + cleaned.slice(1);
    } else {
      cleaned = "+7" + cleaned;
    }
  }
  
  // Ограничиваем до 12 символов (+7 и 10 цифр)
  if (cleaned.length > 12) {
    cleaned = cleaned.slice(0, 12);
  }
  
  // Форматируем с дефисами: +7###-###-##-##
  if (cleaned.length > 2) {
    const digits = cleaned.slice(2);
    let formatted = "+7";
    
    if (digits.length > 0) {
      formatted += digits.slice(0, 3);
    }
    if (digits.length > 3) {
      formatted += "-" + digits.slice(3, 6);
    }
    if (digits.length > 6) {
      formatted += "-" + digits.slice(6, 8);
    }
    if (digits.length > 8) {
      formatted += "-" + digits.slice(8, 10);
    }
    
    return formatted;
  }
  
  return cleaned;
};

const handlePhoneInput = (event) => {
  const formatted = formatPhone(event.target.value);
  phone.value = formatted;
  phoneError.value = "";
  
  // Валидация
  if (formatted && !isPhoneValid.value) {
    phoneError.value = "Телефон должен быть в формате +7###-###-##-##";
  }
};

const handlePhoneBlur = () => {
  if (phone.value && !isPhoneValid.value) {
    phoneError.value = "Телефон должен быть в формате +7###-###-##-##";
  }
};

const addCustomSocialNetwork = () => {
  customSocialNetworks.value.push({ name: "", url: "" });
};

const removeCustomSocialNetwork = (index) => {
  customSocialNetworks.value.splice(index, 1);
};

// Загрузка данных заведения для редактирования
const loadEstablishmentData = () => {
  if (!props.establishment) return;
  
  const est = props.establishment;
  name.value = est.name || "";
  phone.value = est.phone || "";
  address.value = est.address || "";
  description.value = est.description || "";
  
  // Загружаем режим работы
  if (est.working_hours) {
    workingHours.value = {
      monday: est.working_hours.monday || { open_time: "09:00", close_time: "22:00", is_closed: false },
      tuesday: est.working_hours.tuesday || { open_time: "09:00", close_time: "22:00", is_closed: false },
      wednesday: est.working_hours.wednesday || { open_time: "09:00", close_time: "22:00", is_closed: false },
      thursday: est.working_hours.thursday || { open_time: "09:00", close_time: "22:00", is_closed: false },
      friday: est.working_hours.friday || { open_time: "09:00", close_time: "23:00", is_closed: false },
      saturday: est.working_hours.saturday || { open_time: "10:00", close_time: "23:00", is_closed: false },
      sunday: est.working_hours.sunday || { open_time: "10:00", close_time: "22:00", is_closed: false },
    };
  }
  
  // Загружаем социальные сети
  if (est.social_networks) {
    const social = est.social_networks;
    predefinedSocialNetworks.value = {
      instagram: social.instagram || "",
      facebook: social.facebook || "",
      vk: social.vk || "",
      telegram: social.telegram || "",
      website: social.website || "",
    };
    
    // Загружаем кастомные соц сети (все, что не входит в предустановленные)
    const predefinedKeys = ["instagram", "facebook", "vk", "telegram", "website"];
    customSocialNetworks.value = [];
    Object.entries(social).forEach(([key, value]) => {
      if (!predefinedKeys.includes(key) && value) {
        customSocialNetworks.value.push({ name: key, url: value });
      }
    });
  }
};

// Загружаем данные при монтировании или изменении пропса
onMounted(() => {
  loadEstablishmentData();
});

watch(() => props.establishment, () => {
  loadEstablishmentData();
}, { deep: true });

const handleSubmit = async () => {
  // Валидация телефона
  if (!isPhoneValid.value) {
    phoneError.value = "Пожалуйста, введите корректный номер телефона";
    return;
  }
  
  // Собираем все социальные сети
  const socialNetworksData = {};
  
  // Предустановленные
  Object.entries(predefinedSocialNetworks.value).forEach(([key, value]) => {
    if (value.trim() !== "") {
      socialNetworksData[key] = value.trim();
    }
  });
  
  // Кастомные
  customSocialNetworks.value.forEach((item) => {
    if (item.name.trim() !== "" && item.url.trim() !== "") {
      socialNetworksData[item.name.trim()] = item.url.trim();
    }
  });

  const payload = {
    name: name.value,
    phone: phone.value,
    address: address.value,
    description: description.value || null,
    working_hours: workingHours.value,
    social_networks: Object.keys(socialNetworksData).length > 0 ? socialNetworksData : null,
  };

  if (isEditMode.value) {
    // Режим редактирования
    await store.update(props.establishment.id, payload);
    if (!store.errorMessage) {
      emit("updated");
    }
  } else {
    // Режим создания
    await store.create(payload);
    if (!store.errorMessage) {
      emit("created");
      // Сброс формы
      name.value = "";
      phone.value = "";
      phoneError.value = "";
      address.value = "";
      description.value = "";
      predefinedSocialNetworks.value = {
        instagram: "",
        facebook: "",
        vk: "",
        telegram: "",
        website: "",
      };
      customSocialNetworks.value = [];
    }
  }
};

const toggleDayClosed = (day) => {
  workingHours.value[day].is_closed = !workingHours.value[day].is_closed;
};
</script>

<template>
  <form @submit.prevent="handleSubmit" class="create-form">
    <h3>{{ isEditMode ? "Редактировать заведение" : "Добавить заведение" }}</h3>

    <label>
      Название заведения *
      <input v-model="name" type="text" placeholder="Название" required />
    </label>

    <label>
      Телефон *
      <input
        v-model="phone"
        type="tel"
        placeholder="+7999-123-45-67"
        required
        @input="handlePhoneInput"
        @blur="handlePhoneBlur"
        :class="{ error: phoneError }"
      />
      <span v-if="phoneError" class="error-message">{{ phoneError }}</span>
    </label>

    <label>
      Адрес *
      <input v-model="address" type="text" placeholder="Адрес" required />
    </label>

    <label>
      Описание
      <textarea v-model="description" placeholder="Описание заведения" rows="3"></textarea>
    </label>

    <div class="section">
      <h4>Режим работы</h4>
      <div v-for="day in days" :key="day.key" class="working-hours-row">
        <label class="day-label">
          <input
            type="checkbox"
            :checked="!workingHours[day.key].is_closed"
            @change="toggleDayClosed(day.key)"
          />
          {{ day.label }}
        </label>
        <div v-if="!workingHours[day.key].is_closed" class="time-inputs">
          <input
            v-model="workingHours[day.key].open_time"
            type="time"
            class="time-input"
          />
          <span>—</span>
          <input
            v-model="workingHours[day.key].close_time"
            type="time"
            class="time-input"
          />
        </div>
        <span v-else class="closed-label">Выходной</span>
      </div>
    </div>

    <div class="section">
      <h4>Социальные сети</h4>
      
      <div class="predefined-social">
        <label>
          Instagram
          <input
            v-model="predefinedSocialNetworks.instagram"
            type="text"
            placeholder="https://instagram.com/..."
          />
        </label>
        <label>
          Facebook
          <input
            v-model="predefinedSocialNetworks.facebook"
            type="text"
            placeholder="https://facebook.com/..."
          />
        </label>
        <label>
          VK
          <input
            v-model="predefinedSocialNetworks.vk"
            type="text"
            placeholder="https://vk.com/..."
          />
        </label>
        <label>
          Telegram
          <input
            v-model="predefinedSocialNetworks.telegram"
            type="text"
            placeholder="@username"
          />
        </label>
        <label>
          Website
          <input
            v-model="predefinedSocialNetworks.website"
            type="url"
            placeholder="https://example.com"
          />
        </label>
      </div>

      <div class="custom-social">
        <div class="custom-social-header">
          <h5>Дополнительные социальные сети</h5>
          <button type="button" @click="addCustomSocialNetwork" class="btn-add">
            + Добавить
          </button>
        </div>
        
        <div
          v-for="(item, index) in customSocialNetworks"
          :key="index"
          class="custom-social-item"
        >
          <input
            v-model="item.name"
            type="text"
            placeholder="Название (например: TikTok)"
            class="custom-name"
          />
          <input
            v-model="item.url"
            type="text"
            placeholder="URL или username"
            class="custom-url"
          />
          <button
            type="button"
            @click="removeCustomSocialNetwork(index)"
            class="btn-remove"
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
      <button type="submit" :disabled="store.loading" class="btn-primary">
        {{ store.loading ? (isEditMode ? "Сохранение..." : "Создание...") : (isEditMode ? "Сохранить" : "Создать") }}
      </button>
    </div>
  </form>
</template>

<style scoped>
.create-form {
  background: #fff;
  border-radius: 1rem;
  padding: 2rem;
  box-shadow: 0 10px 25px rgba(15, 23, 42, 0.1);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.create-form h3 {
  margin: 0 0 1rem 0;
  color: #0f172a;
}

.create-form h4 {
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

input.error {
  border-color: #dc2626;
}

.error-message {
  color: #dc2626;
  font-size: 0.85rem;
  margin-top: 0.25rem;
}

.section {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e2e8f0;
}

.working-hours-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.75rem;
  padding: 0.5rem;
  border-radius: 0.5rem;
  background: #f8fafc;
}

.day-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 120px;
  flex-direction: row;
  font-size: 0.9rem;
}

.day-label input[type="checkbox"] {
  width: auto;
  margin: 0;
}

.time-inputs {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.time-input {
  padding: 0.5rem;
  width: auto;
}

.closed-label {
  color: #94a3b8;
  font-style: italic;
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

.predefined-social {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.custom-social {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e2e8f0;
}

.custom-social-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.custom-social-header h5 {
  margin: 0;
  color: #0f172a;
  font-size: 0.95rem;
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

.custom-social-item {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  align-items: flex-start;
}

.custom-name {
  flex: 0 0 150px;
}

.custom-url {
  flex: 1;
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

.btn-remove:hover {
  background: #fee2e2;
}
</style>

