"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { ExportButton } from "@/components/business/export-button";
import { VehicleCheckTable } from "@/components/business/vehicle-check-table";
import { LoadingScreen } from "@/components/dashboard/loading-screen";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { businessService } from "@/services/business.service";
import { VehicleCheck } from "@/types/business";

export default function VehicleChecksPage() {
  const [vehicleChecks, setVehicleChecks] = useState<VehicleCheck[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<{ dateFrom?: string; dateTo?: string }>({});

  useEffect(() => {
    void loadVehicleChecks();
  }, []);

  async function loadVehicleChecks(range?: { dateFrom?: string; dateTo?: string }) {
    const nextRange = range ?? dateRange;
    setDateRange(nextRange);
    setIsLoading(true);
    try {
      const data = await businessService.vehicleChecks(nextRange);
      setVehicleChecks(data);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader title="Controles Buy Back" description="Liste des controles vehicules et decisions metier." />
        <div className="flex gap-2">
          <ExportButton dateRange={dateRange} withCollaboratorFilter />
          <Button asChild>
            <Link href="/dashboard/vehicle-checks/new">
              <Plus className="h-4 w-4" />
              Nouveau
            </Link>
          </Button>
        </div>
      </div>
      {isLoading && vehicleChecks.length === 0 ? (
        <LoadingScreen fullScreen={false} />
      ) : (
        <VehicleCheckTable
          dateRange={dateRange}
          vehicleChecks={vehicleChecks}
          onDateFilterChange={loadVehicleChecks}
        />
      )}
    </>
  );
}
