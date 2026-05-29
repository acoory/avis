import { Badge } from "@/components/ui/badge";
import { RepairDecisionStatus, VehicleCheckStatus } from "@/types/business";

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
  COMPLETED: "Complete",
  CANCELLED: "Annule",
};

export function VehicleCheckStatusBadge({ status }: { status: VehicleCheckStatus }) {
  const variant = status === "COMPLETED" ? "success" : status === "CANCELLED" ? "destructive" : "warning";
  return <Badge variant={variant}>{checkLabels[status]}</Badge>;
}
