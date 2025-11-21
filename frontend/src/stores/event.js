import { defineStore } from "pinia";
import {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  deleteEvent,
} from "../services/api";
import { useAuthStore } from "./auth";

export const useEventStore = defineStore("event", {
  state: () => ({
    events: [],
    currentEvent: null,
    loading: false,
    errorMessage: "",
    statusMessage: "",
  }),
  actions: {
    async fetchEvents(establishmentId = null) {
      const authStore = useAuthStore();
      if (!authStore.accessToken) {
        throw new Error("Not authenticated");
      }

      await this.executeTask(async () => {
        const response = await getEvents(authStore.accessToken, establishmentId);
        this.events = response;
        this.statusMessage = "События загружены";
      });
    },
    async fetchEventById(id) {
      const authStore = useAuthStore();
      if (!authStore.accessToken) {
        throw new Error("Not authenticated");
      }

      await this.executeTask(async () => {
        const response = await getEventById(id, authStore.accessToken);
        this.currentEvent = response;
      });
    },
    async create(payload) {
      const authStore = useAuthStore();
      if (!authStore.accessToken) {
        throw new Error("Not authenticated");
      }

      await this.executeTask(async () => {
        const response = await createEvent(payload, authStore.accessToken);
        this.events.unshift(response);
        this.statusMessage = "Событие успешно создано";
        return response;
      });
    },
    async update(id, payload) {
      const authStore = useAuthStore();
      if (!authStore.accessToken) {
        throw new Error("Not authenticated");
      }

      await this.executeTask(async () => {
        const response = await updateEvent(id, payload, authStore.accessToken);
        const index = this.events.findIndex((e) => e.id === id);
        if (index !== -1) {
          this.events[index] = response;
        }
        if (this.currentEvent?.id === id) {
          this.currentEvent = response;
        }
        this.statusMessage = "Событие обновлено";
        return response;
      });
    },
    async remove(id) {
      const authStore = useAuthStore();
      if (!authStore.accessToken) {
        throw new Error("Not authenticated");
      }

      await this.executeTask(async () => {
        await deleteEvent(id, authStore.accessToken);
        this.events = this.events.filter((e) => e.id !== id);
        if (this.currentEvent?.id === id) {
          this.currentEvent = null;
        }
        this.statusMessage = "Событие удалено";
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

