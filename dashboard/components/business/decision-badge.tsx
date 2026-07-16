import { Badge } from "@/components/ui/badge";
import { RepairDecisionStatus, VehicleCheck, VehicleCheckStatus } from "@/types/business";

const decisionLabels: Record<RepairDecisionStatus, string> = {
  ACCEPTED: "Accepte",
  TO_CHECK: "A verifier",
  NOT_PROFITABLE: "Non rentable",
  FORBIDDEN: "Interdit",
  MANDATORY: "Obligatoire",
  WARNING: "Alerte",
};

export function DecisionBadge({ status }: { status: RepairDecisionStatus }) {
  const variant =
    status === "ACCEPTED" || status === "MANDATORY"
      ? "success"
      : status === "FORBIDDEN" || status === "NOT_PROFITABLE"
        ? "destructive"
        : "warning";

  return <Badge variant={variant}>{decisionLabels[status]}</Badge>;
}

const checkLabels: Record<VehicleCheckStatus, string> = {
  DRAFT: "Brouillon",
  TO_ANALYZE: "A analyser",
  SUMMARY_READY: "Synthese prete",
  CLOSED_NO_DAMAGE: "Terminé",
  COMPLETED: "Terminé",
  CANCELLED: "Annule",
};

type VehicleCheckStatusBadgeProps = {
  publicShare?: VehicleCheck["publicShare"];
  status: VehicleCheckStatus;
  workflowStage?: boolean;
};

export function VehicleCheckStatusBadge({
  publicShare,
  status,
  workflowStage = false,
}: VehicleCheckStatusBadgeProps) {
  if (
    status === "CLOSED_NO_DAMAGE" ||
    status === "COMPLETED" ||
    (workflowStage && Boolean(publicShare?.vehicleRecoveredAt))
  ) {
    return <Badge className="bg-blue-50 text-blue-700">Terminé</Badge>;
  }

  if (workflowStage && status === "SUMMARY_READY") {
    return (
      <Badge variant="warning">
        {publicShare?.takenInChargeAt ? "Récupération" : "Dépôt à confirmer"}
      </Badge>
    );
  }

  const variant =
    status === "SUMMARY_READY"
      ? "success"
      : status === "CANCELLED"
        ? "destructive"
        : status === "DRAFT"
          ? "outline"
          : "warning";
  return <Badge variant={variant}>{checkLabels[status]}</Badge>;
}
