import { api } from "@/lib/api";
import { CreateUserPayload, UpdateUserPayload, UserListItem } from "@/types/users";

export const usersService = {
  async users() {
    const { data } = await api.get<UserListItem[]>("/users");
    return data;
  },

  async managers() {
    const { data } = await api.get<UserListItem[]>("/users/managers");
    return data;
  },

  async updateUser(id: string, payload: UpdateUserPayload) {
    const { data } = await api.patch<UserListItem>(`/users/${id}`, payload);
    return data;
  },

  async createUser(payload: CreateUserPayload) {
    const { data } = await api.post<UserListItem>("/users", payload);
    return data;
  },
};
