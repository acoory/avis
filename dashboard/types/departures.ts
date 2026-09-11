export type ProviderType = "DEALERSHIP" | "BODYSHOP" | "GARAGE" | "TIRE_SHOP" | "ASSISTANCE" | "OTHER";
export type InterventionType = "BODYWORK" | "DENT_REMOVAL" | "TIRES" | "MECHANICAL" | "SERVICE" | "WINDSHIELD" | "CLEANING" | "UPHOLSTERY" | "DIAGNOSTIC" | "EXPERTISE" | "ASSISTANCE" | "OTHER";
export type DepartureStatus = "PLANNED" | "TO_PREPARE" | "READY_TO_LEAVE" | "DEPARTED" | "AT_PROVIDER" | "WORK_IN_PROGRESS" | "READY_FOR_PICKUP" | "PICKUP_PLANNED" | "RETURNED" | "CANCELLED";
export type DeparturePriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export type Provider = {
  id: string; name: string; type: ProviderType; address?: string | null; phone?: string | null;
  email?: string | null; contactName?: string | null; notes?: string | null; displayOrder: number; isActive: boolean; agencyId?: string | null;
};
export type Vehicle = { id: string; registration: string; brand?: string | null; model?: string | null };
export type Person = { id: string; firstName?: string | null; lastName?: string | null; email?: string | null };
export type DepartureComment = { id: string; message: string; createdAt: string; user?: Person | null };
export type DepartureHistory = { id: string; action: string; oldValue?: Record<string, unknown> | null; newValue?: Record<string, unknown> | null; metadata?: Record<string, unknown> | null; createdAt: string; user?: Person | null };
export type Departure = {
  id: string; vehicleId: string; providerId: string; vehicle: Vehicle; provider: Provider;
  interventionType: InterventionType; status: DepartureStatus; description?: string | null; priority: DeparturePriority;
  appointmentAt?: string | null; plannedDepartureAt?: string | null; departedAt?: string | null;
  estimatedReturnAt?: string | null; readyAt?: string | null; returnedAt?: string | null;
  assignedUser?: Person | null; createdAt: string; updatedAt: string;
  comments?: DepartureComment[]; histories?: DepartureHistory[]; _count?: { comments: number };
};
export type VehicleSearchResult = Vehicle & { departures: Array<Departure & { provider: Provider }> };

export const STATUS_LABELS: Record<DepartureStatus, string> = {
  PLANNED: "Prévu", TO_PREPARE: "À préparer", READY_TO_LEAVE: "Prêt à partir", DEPARTED: "Parti",
  AT_PROVIDER: "Chez prestataire", WORK_IN_PROGRESS: "Intervention en cours", READY_FOR_PICKUP: "Prêt à récupérer",
  PICKUP_PLANNED: "Récupération prévue", RETURNED: "Revenu", CANCELLED: "Annulé",
};
export const INTERVENTION_LABELS: Record<InterventionType, string> = {
  BODYWORK: "Carrosserie", DENT_REMOVAL: "Débosselage", TIRES: "Pneumatiques", MECHANICAL: "Mécanique",
  SERVICE: "Révision", WINDSHIELD: "Pare-brise", CLEANING: "Nettoyage", UPHOLSTERY: "Sellerie",
  DIAGNOSTIC: "Diagnostic", EXPERTISE: "Expertise", ASSISTANCE: "Assistance", OTHER: "Autre",
};
export const PROVIDER_TYPE_LABELS: Record<ProviderType, string> = {
  DEALERSHIP: "Concession", BODYSHOP: "Carrosserie", GARAGE: "Garage", TIRE_SHOP: "Pneumatique", ASSISTANCE: "Assistance", OTHER: "Autre",
};
