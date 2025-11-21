import { defineStore } from "pinia";
import {
  createEstablishment,
  getEstablishments,
  getEstablishmentById,
  updateEstablishment,
  deleteEstablishment,
} from "../services/api";
import { useAuthStore } from "./auth";

export const useEstablishmentStore = defineStore("establishment", {
  state: () => ({
    establishments: [],
    currentEstablishment: null,
    loading: false,
    errorMessage: "",
    statusMessage: "",
  }),
  actions: {
    async fetchEstablishments() {
      const authStore = useAuthStore();
      if (!authStore.accessToken) {
        throw new Error("Not authenticated");
      }

      await this.executeTask(async () => {
        const response = await getEstablishments(authStore.accessToken);
        this.establishments = response;
        this.statusMessage = "Заведения загружены";
      });
    },
    async fetchEstablishmentById(id) {
      const authStore = useAuthStore();
      if (!authStore.accessToken) {
        throw new Error("Not authenticated");
      }

      await this.executeTask(async () => {
        const response = await getEstablishmentById(id, authStore.accessToken);
        this.currentEstablishment = response;
      });
    },
    async create(payload) {
      const authStore = useAuthStore();
      if (!authStore.accessToken) {
        throw new Error("Not authenticated");
      }

      await this.executeTask(async () => {
        const response = await createEstablishment(payload, authStore.accessToken);
        this.establishments.unshift(response);
        this.statusMessage = "Заведение успешно создано";
        return response;
      });
    },
    async update(id, payload) {
      const authStore = useAuthStore();
      if (!authStore.accessToken) {
        throw new Error("Not authenticated");
      }

      await this.executeTask(async () => {
        const response = await updateEstablishment(id, payload, authStore.accessToken);
        const index = this.establishments.findIndex((e) => e.id === id);
        if (index !== -1) {
          this.establishments[index] = response;
        }
        if (this.currentEstablishment?.id === id) {
          this.currentEstablishment = response;
        }
        this.statusMessage = "Заведение обновлено";
        return response;
      });
    },
    async remove(id) {
      const authStore = useAuthStore();
      if (!authStore.accessToken) {
        throw new Error("Not authenticated");
      }

      await this.executeTask(async () => {
        await deleteEstablishment(id, authStore.accessToken);
        this.establishments = this.establishments.filter((e) => e.id !== id);
        if (this.currentEstablishment?.id === id) {
          this.currentEstablishment = null;
        }
        this.statusMessage = "Заведение удалено";
      });
    },
    async executeTask(task) {
      this.loading = true;
      this.errorMessage = "";
      this.statusMessage = "";
      try {
        await task();
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : "Unknown error";
      } finally {
        this.loading = false;
      }
    },
  },
});

