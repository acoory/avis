"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportVehicleChecksUrl } from "@/services/business.service";
import { useAuthStore } from "@/stores/auth.store";

export function ExportButton() {
  const accessToken = useAuthStore((state) => state.accessToken);

  async function handleExport() {
    const response = await fetch(exportVehicleChecksUrl(), {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    });
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `vehicle-checks-${new Date().toISOString().slice(0, 10)}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button onClick={handleExport} variant="outline">
      <Download className="h-4 w-4" />
      Export Excel
    </Button>
  );
}
