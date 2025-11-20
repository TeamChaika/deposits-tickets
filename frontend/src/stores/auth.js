import { defineStore } from "pinia";
import {
  changeEmail,
  changePassword,
  loginUser,
  registerUser,
  requestPasswordReset,
  resetPassword,
} from "../services/api";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    accessToken: "",
    statusMessage: "",
    errorMessage: "",
    loading: false,
  }),
  actions: {
    async register(payload) {
      await this.executeTask(async () => {
        const response = await registerUser(payload);
        this.accessToken = response.access_token ?? "";
        this.statusMessage = response.message;
      });
    },
    async login(payload) {
      await this.executeTask(async () => {
        const response = await loginUser(payload);
        this.accessToken = response.access_token ?? "";
        this.statusMessage = response.message;
      });
    },
    async requestPasswordReset(payload) {
      await this.executeTask(async () => {
        const response = await requestPasswordReset(payload);
        this.statusMessage = response.message;
      });
    },
    async resetPassword(payload) {
      await this.executeTask(async () => {
        const response = await resetPassword(payload);
        this.statusMessage = response.message;
      });
    },
    async changePassword(payload) {
      await this.executeTask(async () => {
        const response = await changePassword(payload);
        this.statusMessage = response.message;
      });
    },
    async changeEmail(payload) {
      await this.executeTask(async () => {
        const response = await changeEmail(payload);
        this.statusMessage = response.message;
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

