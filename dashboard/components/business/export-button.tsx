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
  selectedCollaboratorId?: string;
  onCollaboratorChange?: (collaboratorId: string) => void;
  withCollaboratorFilter?: boolean;
};

export function ExportButton({
  dateRange,
  onCollaboratorChange,
  selectedCollaboratorId,
  withCollaboratorFilter = false,
}: ExportButtonProps) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const [internalCollaboratorId, setInternalCollaboratorId] = useState("");
  const [users, setUsers] = useState<UserListItem[]>([]);
  const canSelectCollaborator = withCollaboratorFilter && user?.role !== "COLLABORATOR";
  const collaboratorId = selectedCollaboratorId ?? internalCollaboratorId;

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
        collaboratorId: collaboratorId || undefined,
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
    <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-center">
      {canSelectCollaborator ? (
        <select
          className="h-9 min-w-0 rounded-md border border-gray-200 bg-white px-2 text-xs font-medium text-gray-900 shadow-sm sm:w-56 sm:text-sm"
          value={collaboratorId}
          onChange={(event) => {
            setInternalCollaboratorId(event.target.value);
            onCollaboratorChange?.(event.target.value);
          }}
        >
          <option value="">Tous les collaborateurs</option>
          {collaboratorOptions.map((collaborator) => (
            <option key={collaborator.id} value={collaborator.id}>
              {collaborator.firstName} {collaborator.lastName}
            </option>
          ))}
        </select>
      ) : null}
      <Button className={canSelectCollaborator ? "h-9 min-w-0 px-2 text-xs sm:px-3 sm:text-sm" : "col-span-2 h-9 px-2 text-xs sm:text-sm"} onClick={handleExport} variant="outline">
        <Download className="h-3.5 w-3.5" />
        <span className="truncate">Export Excel</span>
      </Button>
    </div>
  );
}
