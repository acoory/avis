import { Role } from "@/types/auth";

export type UserListItem = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  managerId?: string | null;
  manager?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: Role;
  } | null;
  isActive: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    collaborators: number;
    vehicleChecks: number;
  };
};

export type UpdateUserPayload = Partial<{
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: Role;
  isActive: boolean;
  managerId: string | null;
}>;

export type CreateUserPayload = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: Role;
  isActive?: boolean;
  managerId?: string | null;
};
