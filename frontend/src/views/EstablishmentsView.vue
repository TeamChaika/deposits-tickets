<script setup>
import { onMounted, ref } from "vue";
import { useEstablishmentStore } from "../stores/establishment";
import { useAuthStore } from "../stores/auth";
import { useRouter } from "vue-router";
import CreateEstablishmentForm from "../components/CreateEstablishmentForm.vue";

const store = useEstablishmentStore();
const authStore = useAuthStore();
const router = useRouter();

const showCreateForm = ref(false);
const editingEstablishment = ref(null);

onMounted(async () => {
  if (!authStore.accessToken) {
    router.push("/login");
    return;
  }
  await store.fetchEstablishments();
});
</script>

<template>
  <div class="establishments-container">
    <div class="header">
      <h2>Мои заведения</h2>
      <button @click="showCreateForm = !showCreateForm" class="btn-primary">
        {{ showCreateForm ? "Отмена" : "+ Добавить заведение" }}
      </button>
    </div>

    <p v-if="store.statusMessage" class="status success">{{ store.statusMessage }}</p>
    <p v-if="store.errorMessage" class="status error">{{ store.errorMessage }}</p>

    <div v-if="showCreateForm || editingEstablishment" class="create-form">
      <CreateEstablishmentForm
        :establishment="editingEstablishment"
        @created="
          showCreateForm = false;
          store.fetchEstablishments();
        "
        @updated="
          editingEstablishment = null;
          store.fetchEstablishments();
        "
        @cancel="
          showCreateForm = false;
          editingEstablishment = null;
        "
      />
    </div>

    <div v-if="store.loading && store.establishments.length === 0" class="loading">
      Загрузка...
    </div>

    <div v-else-if="store.establishments.length === 0" class="empty-state">
      <p>У вас пока нет заведений</p>
      <button @click="showCreateForm = true" class="btn-primary">
        Создать первое заведение
      </button>
    </div>

    <div v-else class="establishments-grid">
      <div
        v-for="establishment in store.establishments"
        :key="establishment.id"
        class="establishment-card"
      >
        <h3>{{ establishment.name }}</h3>
        <div class="info">
          <p><strong>Телефон:</strong> {{ establishment.phone }}</p>
          <p><strong>Адрес:</strong> {{ establishment.address }}</p>
          <p v-if="establishment.description">
            <strong>Описание:</strong> {{ establishment.description }}
          </p>
        </div>
        <div class="actions">
          <button
            @click="editingEstablishment = establishment"
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
.establishments-container {
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
}

.header h2 {
  margin: 0;
  color: #0f172a;
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

.establishments-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.establishment-card {
  background: #fff;
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: 0 10px 25px rgba(15, 23, 42, 0.1);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.establishment-card h3 {
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

