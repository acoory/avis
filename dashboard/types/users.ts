import { Role } from "@/types/auth";

export type UserListItem = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  managerAssignments?: Array<{
    assignedAt: string;
    isPrimary: boolean;
    managerId: string;
    manager: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      role: Role;
    };
  }>;
  isActive: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    managedCollaboratorAssignments: number;
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
  managerIds: string[];
}>;

export type CreateUserPayload = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: Role;
  isActive?: boolean;
  managerIds?: string[];
};
