export type VehicleCheckStatus = "DRAFT" | "COMPLETED" | "CANCELLED";
export type RepairDecisionStatus =
  | "ACCEPTED"
  | "TO_CHECK"
  | "NOT_PROFITABLE"
  | "FORBIDDEN"
  | "MANDATORY"
  | "WARNING";
export type PartOrderStatus = "NOT_REQUIRED" | "TO_ORDER" | "ORDERED";

export type Agency = {
  id: string;
  name: string;
  city: string;
};

export type Manufacturer = {
  id: string;
  name: string;
  rule?: ManufacturerRule | null;
  _count?: {
    models: number;
    repairRules: number;
    checks: number;
  };
};

export type VehicleModel = {
  id: string;
  name: string;
  manufacturerId: string;
  manufacturer?: Manufacturer;
};

export type RepairType = {
  id: string;
  name: string;
  code: string;
  defaultInternalSavingAmount: string;
  defaultInternalCost: string;
  isActive: boolean;
};

export type ManufacturerRule = {
  id: string;
  manufacturerId: string;
  constructorAllowanceAmount: string;
  laborRate?: string | null;
  paintRate?: string | null;
  partsDiscountRate?: string | null;
  dentRemovalCost?: string | null;
  servicingCost?: string | null;
  revisionRequired: boolean;
  notes?: string | null;
};

export type VehicleCheck = {
  id: string;
  checkNumber: string;
  licensePlate: string;
  mileage?: number | null;
  checkDate: string;
  city: string;
  status: VehicleCheckStatus;
  totalInternalSavingAmount: string;
  totalInternalCost: string;
  constructorAllowanceAmount: string;
  allowanceDifferenceAmount: string;
  decisionSummary?: string | null;
  notes?: string | null;
  collaborator?: {
    firstName: string;
    lastName: string;
    email: string;
  };
  agency?: Agency;
  manufacturer?: Manufacturer;
  vehicleModel?: VehicleModel | null;
  items?: Array<{
    id: string;
    quantity: number;
    comment?: string | null;
    partOrderRequired: boolean;
    partOrderStatus: PartOrderStatus;
    partOrderPrice?: string | null;
    partOrderReference?: string | null;
    partOrderedAt?: string | null;
    decisionStatus: RepairDecisionStatus;
    decisionMessage?: string | null;
    repairType: RepairType;
  }>;
};

export type RepairDecisionInputItem = {
  repairTypeId: string;
  quantity: number;
  comment?: string;
  partOrderRequired?: boolean;
};

export type RepairDecisionPreview = {
  manufacturerId: string;
  manufacturerName: string;
  constructorAllowanceAmount: string;
  totalInternalSavingAmount: string;
  totalInternalCost: string;
  allowanceDifferenceAmount: string;
  decisionSummary: string;
  alerts: string[];
  items: Array<{
    repairTypeId: string;
    repairTypeCode: string;
    repairTypeName: string;
    quantity: number;
    unitInternalSavingAmount: string;
    totalInternalSavingAmount: string;
    unitInternalCost: string;
    totalInternalCost: string;
    decisionStatus: RepairDecisionStatus;
    decisionMessage: string;
    comment?: string;
    partOrderRequired: boolean;
  }>;
  missingMandatoryRepairTypes: Array<{
    repairTypeId: string;
    repairTypeCode: string;
    repairTypeName: string;
    message: string;
  }>;
  recommendedRepairTypes?: Array<{
    repairTypeId: string;
    repairTypeCode: string;
    repairTypeName: string;
    message: string;
  }>;
};

export type VehicleCheckItem = NonNullable<VehicleCheck["items"]>[number];

export type CreateVehicleCheckPayload = {
  agencyId: string;
  manufacturerId: string;
  vehicleModelId?: string;
  licensePlate: string;
  mileage?: number;
  checkDate?: string;
  city: string;
  notes?: string;
  items: RepairDecisionInputItem[];
};

export type DashboardSummary = {
  vehicleChecksCount: number;
  completedVehicleChecksCount: number;
  draftVehicleChecksCount: number;
  totalInternalSavingAmount: string;
  totalInternalCost: string;
  totalExternalCost: string;
  totalDifferenceAmount: string;
  alertItemsCount: number;
  partOrdersToPlaceCount?: number;
  recentVehicleChecks: VehicleCheck[];
};
