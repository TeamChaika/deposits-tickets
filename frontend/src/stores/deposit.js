import { defineStore } from "pinia";
import {
  createDeposit,
  getDeposits,
  getDepositById,
  getDepositByLink,
  updateDeposit,
  deleteDeposit,
} from "../services/api";
import { useAuthStore } from "./auth";

export const useDepositStore = defineStore("deposit", {
  state: () => ({
    deposits: [],
    currentDeposit: null,
    loading: false,
    errorMessage: "",
    statusMessage: "",
  }),
  actions: {
    async fetchDeposits(establishmentId = null, eventId = null) {
      const authStore = useAuthStore();
      if (!authStore.accessToken) {
        throw new Error("Not authenticated");
      }

      await this.executeTask(async () => {
        const response = await getDeposits(
          authStore.accessToken,
          establishmentId,
          eventId
        );
        this.deposits = response;
        this.statusMessage = "Депозиты загружены";
      });
    },
    async fetchDepositById(id) {
      const authStore = useAuthStore();
      if (!authStore.accessToken) {
        throw new Error("Not authenticated");
      }

      await this.executeTask(async () => {
        const response = await getDepositById(id, authStore.accessToken);
        this.currentDeposit = response;
      });
    },
    async fetchDepositByLink(paymentLink) {
      await this.executeTask(async () => {
        const response = await getDepositByLink(paymentLink);
        this.currentDeposit = response;
      });
    },
    async create(payload) {
      const authStore = useAuthStore();
      if (!authStore.accessToken) {
        throw new Error("Not authenticated");
      }

      await this.executeTask(async () => {
        const response = await createDeposit(payload, authStore.accessToken);
        this.deposits.unshift(response);
        this.statusMessage = "Депозит успешно создан";
        return response;
      });
    },
    async update(id, payload) {
      const authStore = useAuthStore();
      if (!authStore.accessToken) {
        throw new Error("Not authenticated");
      }

      await this.executeTask(async () => {
        const response = await updateDeposit(id, payload, authStore.accessToken);
        const index = this.deposits.findIndex((d) => d.id === id);
        if (index !== -1) {
          this.deposits[index] = response;
        }
        if (this.currentDeposit?.id === id) {
          this.currentDeposit = response;
        }
        this.statusMessage = "Депозит обновлен";
        return response;
      });
    },
    async remove(id) {
      const authStore = useAuthStore();
      if (!authStore.accessToken) {
        throw new Error("Not authenticated");
      }

      await this.executeTask(async () => {
        await deleteDeposit(id, authStore.accessToken);
        this.deposits = this.deposits.filter((d) => d.id !== id);
        if (this.currentDeposit?.id === id) {
          this.currentDeposit = null;
        }
        this.statusMessage = "Депозит удален";
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

