import { api } from "@/lib/api";
import { AuthResponse, LoginPayload, User } from "@/types/auth";

export const authService = {
  async login(payload: LoginPayload) {
    const { data } = await api.post<AuthResponse>("/auth/login", payload);
    return data;
  },

  async me() {
    const { data } = await api.get<User>("/auth/me");
    return data;
  },

  async logout() {
    await api.post("/auth/logout");
  },
};
