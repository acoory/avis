export type Role = "ADMIN" | "MANAGER" | "COLLABORATOR";

export type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  user: User;
};
