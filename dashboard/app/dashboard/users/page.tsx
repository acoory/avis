"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { RoleGuard } from "@/components/auth/role-guard";
import { DataTable } from "@/components/dashboard/data-table";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/format";
import { usersService } from "@/services/users.service";
import { useAuthStore } from "@/stores/auth.store";
import { Role } from "@/types/auth";
import { CreateUserPayload, UserListItem } from "@/types/users";

const roleLabels: Record<Role, string> = {
  ADMIN: "Admin",
  MANAGER: "Manager",
  COLLABORATOR: "Collaborateur",
};

type EditUserForm = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  isActive: boolean;
};

export default function UsersPage() {
  const currentUser = useAuthStore((state) => state.user);
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [managers, setManagers] = useState<UserListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editingUser, setEditingUser] = useState<UserListItem | null>(null);
  const [editForm, setEditForm] = useState<EditUserForm>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    isActive: true,
  });
  const [createForm, setCreateForm] = useState<CreateUserPayload>({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    role: "COLLABORATOR",
    managerId: null,
    isActive: true,
  });

  useEffect(() => {
    let isMounted = true;

    Promise.all([usersService.users(), usersService.managers()])
      .then(([usersData, managersData]) => {
        if (!isMounted) {
          return;
        }

        setUsers(usersData);
        setManagers(managersData);
      })
      .catch(() => {
        toast.error("Impossible de charger les utilisateurs.");
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const replaceUser = useCallback((updatedUser: UserListItem) => {
    setUsers((current) => current.map((item) => (item.id === updatedUser.id ? updatedUser : item)));
    setEditingUser((current) => (current?.id === updatedUser.id ? updatedUser : current));
  }, []);

  const updateRole = useCallback(async (user: UserListItem, role: Role) => {
    if (currentUser?.role !== "ADMIN") {
      return;
    }

    setUpdatingUserId(user.id);
    try {
      const updatedUser = await usersService.updateUser(user.id, {
        role,
        managerId: role === "COLLABORATOR" ? user.managerId ?? null : null,
      });
      replaceUser(updatedUser);
      toast.success("Role utilisateur mis a jour.");
    } catch {
      toast.error("Impossible de modifier le role.");
    } finally {
      setUpdatingUserId(null);
    }
  }, [currentUser?.role, replaceUser]);

  const updateManager = useCallback(async (user: UserListItem, managerId: string) => {
    if (currentUser?.role !== "ADMIN") {
      return;
    }

    setUpdatingUserId(user.id);
    try {
      const updatedUser = await usersService.updateUser(user.id, {
        managerId: managerId || null,
      });
      replaceUser(updatedUser);
      toast.success("Manager attribue.");
    } catch {
      toast.error("Impossible d'attribuer ce manager.");
    } finally {
      setUpdatingUserId(null);
    }
  }, [currentUser?.role, replaceUser]);

  const startEdit = useCallback((user: UserListItem) => {
    if (currentUser?.role === "MANAGER" && user.id === currentUser.id) {
      toast.error("Un manager ne peut modifier que ses collaborateurs depuis cet ecran.");
      return;
    }

    setEditingUser(user);
    setEditForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      password: "",
      isActive: user.isActive,
    });
  }, [currentUser]);

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingUser) {
      return;
    }

    if (!editForm.firstName || !editForm.lastName || !editForm.email) {
      toast.error("Renseigne le prenom, le nom et l'email.");
      return;
    }

    if (editForm.password && editForm.password.length < 8) {
      toast.error("Le mot de passe doit contenir au moins 8 caracteres.");
      return;
    }

    if (editForm.password) {
      const confirmed = window.confirm("Confirmer le changement de mot de passe pour cet utilisateur ?");
      if (!confirmed) {
        return;
      }
    }

    if (editForm.isActive !== editingUser.isActive) {
      const action = editForm.isActive ? "reactiver" : "desactiver";
      const confirmed = window.confirm(`Confirmer l'action : ${action} ce compte utilisateur ?`);
      if (!confirmed) {
        return;
      }
    }

    setIsSavingEdit(true);
    try {
      const updatedUser = await usersService.updateUser(editingUser.id, {
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        email: editForm.email,
        isActive: editForm.isActive,
        ...(editForm.password ? { password: editForm.password } : {}),
      });
      replaceUser(updatedUser);
      setEditForm((current) => ({ ...current, password: "" }));
      toast.success("Utilisateur mis a jour.");
    } catch {
      toast.error("Impossible de modifier cet utilisateur. Verifie les champs saisis.");
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!createForm.email || !createForm.password || !createForm.firstName || !createForm.lastName) {
      toast.error("Renseigne le prenom, le nom, l'email et le mot de passe.");
      return;
    }

    if (createForm.password.length < 8) {
      toast.error("Le mot de passe doit contenir au moins 8 caracteres.");
      return;
    }

    setIsCreating(true);
    try {
      const payload: CreateUserPayload = {
        ...createForm,
        role: currentUser?.role === "MANAGER" ? "COLLABORATOR" : createForm.role,
        managerId:
          currentUser?.role === "MANAGER"
            ? currentUser.id
            : createForm.role === "COLLABORATOR"
              ? createForm.managerId || null
              : null,
      };
      const createdUser = await usersService.createUser(payload);
      setUsers((current) => [createdUser, ...current]);
      toast.success("Utilisateur cree avec succes.");
      setCreateForm({
        email: "",
        password: "",
        firstName: "",
        lastName: "",
        role: "COLLABORATOR",
        managerId: null,
        isActive: true,
      });
    } catch {
      toast.error("Impossible de creer cet utilisateur. Verifie les champs saisis.");
    } finally {
      setIsCreating(false);
    }
  }

  const columns = useMemo(
    () => {
      const baseColumns = [
      {
        id: "name",
        header: "Nom",
        cell: (user: UserListItem) => (
          <div>
            <p className="font-medium text-gray-950">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>
        ),
        sortValue: (user: UserListItem) => `${user.firstName} ${user.lastName}`,
        searchValue: (user: UserListItem) => `${user.firstName} ${user.lastName} ${user.email}`,
      },
      {
        id: "role",
        header: "Role",
        cell: (user: UserListItem) =>
          currentUser?.role === "ADMIN" ? (
            <select
              className="h-9 rounded-md border border-gray-200 bg-white px-2 text-sm text-gray-900 shadow-sm disabled:opacity-50"
              disabled={updatingUserId === user.id}
              value={user.role}
              onChange={(event) => void updateRole(user, event.target.value as Role)}
            >
              {Object.entries(roleLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          ) : (
            <Badge variant={user.role === "MANAGER" ? "outline" : "default"}>{roleLabels[user.role]}</Badge>
          ),
        sortValue: (user: UserListItem) => user.role,
      },
      {
        id: "collaborators",
        header: "Equipe",
        cell: (user: UserListItem) => (
          <span className="font-medium text-gray-900">{user._count?.collaborators ?? 0}</span>
        ),
        sortValue: (user: UserListItem) => user._count?.collaborators ?? 0,
      },
      {
        id: "checks",
        header: "Controles",
        cell: (user: UserListItem) => (
          <span className="font-medium text-gray-900">{user._count?.vehicleChecks ?? 0}</span>
        ),
        sortValue: (user: UserListItem) => user._count?.vehicleChecks ?? 0,
      },
      {
        id: "status",
        header: "Statut",
        cell: (user: UserListItem) => (
          <Badge variant={user.isActive ? "success" : "destructive"}>
            {user.isActive ? "Actif" : "Inactif"}
          </Badge>
        ),
        sortValue: (user: UserListItem) => (user.isActive ? 1 : 0),
      },
      {
        id: "createdAt",
        header: "Creation",
        cell: (user: UserListItem) => <span>{formatDate(user.createdAt)}</span>,
        sortValue: (user: UserListItem) => new Date(user.createdAt),
      },
      {
        id: "actions",
        header: "Actions",
        cell: (user: UserListItem) =>
          currentUser?.role === "ADMIN" || user.managerId === currentUser?.id ? (
            <Button size="sm" type="button" variant="outline" onClick={() => startEdit(user)}>
              Modifier
            </Button>
          ) : (
            <span className="text-xs text-gray-400">Lecture seule</span>
          ),
      },
    ];

      if (currentUser?.role === "ADMIN") {
        baseColumns.splice(2, 0, {
          id: "manager",
          header: "Manager",
          cell: (user: UserListItem) =>
            user.role === "COLLABORATOR" ? (
              <select
                className="h-9 w-48 rounded-md border border-gray-200 bg-white px-2 text-sm text-gray-900 shadow-sm disabled:opacity-50"
                disabled={updatingUserId === user.id}
                value={user.managerId ?? ""}
                onChange={(event) => void updateManager(user, event.target.value)}
              >
                <option value="">Aucun manager</option>
                {managers.map((manager) => (
                  <option key={manager.id} value={manager.id}>
                    {manager.firstName} {manager.lastName}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-gray-400">Non applicable</span>
            ),
          sortValue: (user: UserListItem) =>
            user.manager ? `${user.manager.firstName} ${user.manager.lastName}` : "",
          searchValue: (user: UserListItem) =>
            user.manager ? `${user.manager.firstName} ${user.manager.lastName}` : "",
        });
      }

      return baseColumns;
    },
    [currentUser?.id, currentUser?.role, managers, startEdit, updateManager, updateRole, updatingUserId],
  );

  return (
    <RoleGuard roles={["ADMIN", "MANAGER"]}>
      <PageHeader
        title="Utilisateurs"
        description={
          currentUser?.role === "MANAGER"
            ? "Creation et suivi de tes collaborateurs."
            : "Gestion des roles et attribution des collaborateurs aux managers."
        }
      />
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Ajouter un utilisateur</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 lg:grid-cols-6" onSubmit={(event) => void createUser(event)}>
            <Input
              placeholder="Prenom"
              value={createForm.firstName}
              onChange={(event) => setCreateForm((current) => ({ ...current, firstName: event.target.value }))}
            />
            <Input
              placeholder="Nom"
              value={createForm.lastName}
              onChange={(event) => setCreateForm((current) => ({ ...current, lastName: event.target.value }))}
            />
            <Input
              placeholder="Email"
              type="email"
              value={createForm.email}
              onChange={(event) => setCreateForm((current) => ({ ...current, email: event.target.value }))}
            />
            <Input
              placeholder="Mot de passe"
              type="password"
              value={createForm.password}
              onChange={(event) => setCreateForm((current) => ({ ...current, password: event.target.value }))}
            />
            {currentUser?.role === "ADMIN" ? (
              <select
                className="h-10 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 shadow-sm"
                value={createForm.role}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    role: event.target.value as Role,
                    managerId: event.target.value === "COLLABORATOR" ? current.managerId : null,
                  }))
                }
              >
                {Object.entries(roleLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            ) : (
              <div className="flex h-10 items-center rounded-md border border-gray-200 px-3 text-sm text-gray-600">
                Collaborateur
              </div>
            )}
            {currentUser?.role === "ADMIN" && createForm.role === "COLLABORATOR" ? (
              <select
                className="h-10 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 shadow-sm"
                value={createForm.managerId ?? ""}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, managerId: event.target.value || null }))
                }
              >
                <option value="">Aucun manager</option>
                {managers.map((manager) => (
                  <option key={manager.id} value={manager.id}>
                    {manager.firstName} {manager.lastName}
                  </option>
                ))}
              </select>
            ) : null}
            <Button className="lg:col-start-6" disabled={isCreating} type="submit">
              {isCreating ? "Creation..." : "Ajouter"}
            </Button>
          </form>
        </CardContent>
      </Card>
      {editingUser ? (
        <Card className="mb-4 border-teal-200">
          <CardHeader>
            <CardTitle>
              Modifier {editingUser.firstName} {editingUser.lastName}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={(event) => void saveEdit(event)}>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase text-gray-500">Prenom</label>
                  <Input
                    value={editForm.firstName}
                    onChange={(event) =>
                      setEditForm((current) => ({ ...current, firstName: event.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase text-gray-500">Nom</label>
                  <Input
                    value={editForm.lastName}
                    onChange={(event) =>
                      setEditForm((current) => ({ ...current, lastName: event.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase text-gray-500">Email</label>
                  <Input
                    type="email"
                    value={editForm.email}
                    onChange={(event) => setEditForm((current) => ({ ...current, email: event.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase text-gray-500">Statut</label>
                  <select
                    className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 shadow-sm"
                    value={editForm.isActive ? "active" : "inactive"}
                    onChange={(event) =>
                      setEditForm((current) => ({ ...current, isActive: event.target.value === "active" }))
                    }
                  >
                    <option value="active">Actif</option>
                    <option value="inactive">Inactif</option>
                  </select>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-end">
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase text-gray-500">
                    Nouveau mot de passe
                  </label>
                  <Input
                    placeholder="Laisser vide pour ne pas modifier"
                    type="password"
                    value={editForm.password}
                    onChange={(event) =>
                      setEditForm((current) => ({ ...current, password: event.target.value }))
                    }
                  />
                  <p className="mt-1 text-xs text-gray-500">8 caracteres minimum.</p>
                </div>
                <Button disabled={isSavingEdit} type="submit">
                  {isSavingEdit ? "Enregistrement..." : "Enregistrer"}
                </Button>
                <Button
                  disabled={isSavingEdit}
                  type="button"
                  variant="outline"
                  onClick={() => setEditingUser(null)}
                >
                  Annuler
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}
      <DataTable
        columns={columns}
        data={users}
        emptyMessage={isLoading ? "Chargement des utilisateurs..." : "Aucun utilisateur."}
        minWidth={1080}
      />
    </RoleGuard>
  );
}
