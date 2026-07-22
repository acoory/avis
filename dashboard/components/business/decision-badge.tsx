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
  items?: VehicleCheck["items"];
  publicShare?: VehicleCheck["publicShare"];
  status: VehicleCheckStatus;
  workflowStage?: boolean;
};

export function VehicleCheckStatusBadge({
  items,
  publicShare,
  status,
  workflowStage = false,
}: VehicleCheckStatusBadgeProps) {
  if (
    status === "CLOSED_NO_DAMAGE" ||
    status === "COMPLETED"
  ) {
    return <Badge className="bg-blue-50 text-blue-700">Terminé</Badge>;
  }

  if (workflowStage && status === "SUMMARY_READY") {
    const selectedItems = (items ?? []).filter(
      (item) => item.selectedForSummary && item.operationalStatus === "ACTIVE",
    );
    const onSiteItems = selectedItems.filter((item) => item.executionMode === "ON_SITE");
    const externalItems = selectedItems.filter((item) => item.executionMode === "EXTERNAL_PROVIDER");

    if (onSiteItems.length || externalItems.length) {
      const onSiteCompleted =
        onSiteItems.length > 0 &&
        onSiteItems.every((item) => Boolean(item.executionCompletedAt));

      return (
        <span className="flex flex-wrap gap-1.5">
          {onSiteItems.length ? (
            <Badge variant={onSiteCompleted ? "success" : "warning"}>
              {onSiteCompleted ? "Sur place terminée" : "Réparation sur place"}
            </Badge>
          ) : null}
          {externalItems.length ? (
            publicShare?.vehicleRecoveredAt ? (
              <Badge className="bg-blue-50 text-blue-700">Récupéré</Badge>
            ) : publicShare?.takenInChargeAt ? (
              <Badge variant="success">Chez prestataire</Badge>
            ) : (
              <Badge variant="warning">Dépôt à confirmer</Badge>
            )
          ) : null}
        </span>
      );
    }

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
