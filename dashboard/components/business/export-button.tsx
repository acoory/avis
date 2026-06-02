"use client";

import { Download } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { exportVehicleChecksUrl } from "@/services/business.service";
import { usersService } from "@/services/users.service";
import { useAuthStore } from "@/stores/auth.store";
import { UserListItem } from "@/types/users";

type ExportButtonProps = {
  dateRange?: { dateFrom?: string; dateTo?: string };
  withCollaboratorFilter?: boolean;
};

export function ExportButton({ dateRange, withCollaboratorFilter = false }: ExportButtonProps) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const [selectedCollaboratorId, setSelectedCollaboratorId] = useState("");
  const [users, setUsers] = useState<UserListItem[]>([]);
  const canSelectCollaborator = withCollaboratorFilter && user?.role !== "COLLABORATOR";

  useEffect(() => {
    if (!canSelectCollaborator) {
      return;
    }

    void usersService.users().then(setUsers).catch(() => setUsers([]));
  }, [canSelectCollaborator]);

  const collaboratorOptions = useMemo(
    () =>
      users
        .filter((item) => item.isActive && item.role !== "ADMIN")
        .sort((first, second) =>
          `${first.firstName} ${first.lastName}`.localeCompare(`${second.firstName} ${second.lastName}`, "fr", {
            sensitivity: "base",
          }),
        ),
    [users],
  );

  async function handleExport() {
    const response = await fetch(
      exportVehicleChecksUrl({
        collaboratorId: selectedCollaboratorId || undefined,
        dateFrom: dateRange?.dateFrom,
        dateTo: dateRange?.dateTo,
      }),
      {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      },
    );
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `vehicle-checks-${new Date().toISOString().slice(0, 10)}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      {canSelectCollaborator ? (
        <select
          className="h-10 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 shadow-sm"
          value={selectedCollaboratorId}
          onChange={(event) => setSelectedCollaboratorId(event.target.value)}
        >
          <option value="">Tous les collaborateurs</option>
          {collaboratorOptions.map((collaborator) => (
            <option key={collaborator.id} value={collaborator.id}>
              {collaborator.firstName} {collaborator.lastName}
            </option>
          ))}
        </select>
      ) : null}
      <Button onClick={handleExport} variant="outline">
        <Download className="h-4 w-4" />
        Export Excel
      </Button>
    </div>
  );
}
