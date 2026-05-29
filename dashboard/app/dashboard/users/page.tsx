"use client";

import { RoleGuard } from "@/components/auth/role-guard";
import { DataTablePlaceholder } from "@/components/dashboard/data-table-placeholder";
import { PageHeader } from "@/components/dashboard/page-header";

export default function UsersPage() {
  return (
    <RoleGuard roles={["ADMIN"]}>
      <PageHeader
        title="Utilisateurs"
        description="Gestion reservee aux administrateurs. La table sera connectee a l'API Users."
      />
      <DataTablePlaceholder columns={["Nom", "Email", "Role", "Statut", "Actions"]} title="Comptes utilisateurs" />
    </RoleGuard>
  );
}
