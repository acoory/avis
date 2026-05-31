"use client";

import Link from "next/link";
import { CheckCircle2, Pencil, Printer } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { businessService } from "@/services/business.service";
import { VehicleCheck } from "@/types/business";

type VehicleCheckActionsProps = {
  vehicleCheck: VehicleCheck;
  onCompleted: (vehicleCheck: VehicleCheck) => void;
};

export function VehicleCheckActions({ vehicleCheck, onCompleted }: VehicleCheckActionsProps) {
  const [isCompleting, setIsCompleting] = useState(false);
  const canComplete = vehicleCheck.status === "DRAFT";

  async function handleComplete() {
    setIsCompleting(true);

    try {
      const completed = await businessService.completeVehicleCheck(vehicleCheck.id);
      onCompleted(completed);
      toast.success("Controle complete avec succes.");
    } catch {
      toast.error("Impossible de completer ce controle. Verifie les reparations interdites.");
    } finally {
      setIsCompleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:items-end">
      <div className="flex gap-2">
        <Button asChild variant="outline">
          <Link
            href={`/dashboard/vehicle-checks/${vehicleCheck.id}/print?autoprint=1`}
            rel="noreferrer"
            target="_blank"
          >
            <Printer className="h-4 w-4" />
            PDF
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/dashboard/vehicle-checks/${vehicleCheck.id}/edit`}>
            <Pencil className="h-4 w-4" />
            Modifier
          </Link>
        </Button>
        <Button disabled={!canComplete || isCompleting} onClick={handleComplete}>
          <CheckCircle2 className="h-4 w-4" />
          {isCompleting ? "Completion..." : "Completer"}
        </Button>
      </div>
    </div>
  );
}
