"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { RiskVehicleWorkspace } from "@/components/risk/risk-vehicle-workspace";
import { LoadingScreen } from "@/components/dashboard/loading-screen";
import { PageHeader } from "@/components/dashboard/page-header";
import { riskService } from "@/services/risk.service";
import { RiskVehicle } from "@/types/risk";

export default function RiskVehiclePage() {
  const params = useParams<{ id: string }>();
  const [vehicle, setVehicle] = useState<RiskVehicle | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void riskService
      .findOne(params.id)
      .then(setVehicle)
      .finally(() => setIsLoading(false));
  }, [params.id]);

  if (isLoading) return <LoadingScreen />;
  if (!vehicle) {
    return (
      <PageHeader
        title="Dossier Risk introuvable"
        description="Vous n'avez peut-etre pas acces a ce dossier."
      />
    );
  }
  return <RiskVehicleWorkspace initialVehicle={vehicle} />;
}
