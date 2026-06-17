export type VehicleCheckStatus = "DRAFT" | "COMPLETED" | "CANCELLED";
export type RepairDecisionStatus =
  | "ACCEPTED"
  | "TO_CHECK"
  | "NOT_PROFITABLE"
  | "FORBIDDEN"
  | "MANDATORY"
  | "WARNING";
export type PartOrderStatus = "NOT_REQUIRED" | "TO_ORDER" | "ORDERED";
export type VehicleCheckItemOperationalStatus = "ACTIVE" | "IMPOSSIBLE" | "CANCELLED";
export type ManufacturerRepairRuleStatus =
  | "ALLOWED"
  | "FORBIDDEN"
  | "TO_CHECK"
  | "MANDATORY"
  | "CONDITIONAL";

export type Agency = {
  id: string;
  code: string;
  name: string;
  city: string;
  region: string;
  isActive: boolean;
};

export type Manufacturer = {
  id: string;
  name: string;
  rule?: ManufacturerRule | null;
  repairRules?: ManufacturerRepairRule[];
  _count?: {
    models: number;
    repairRules: number;
    checks: number;
  };
};

export type ManufacturerRepairRule = {
  id: string;
  repairTypeId: string;
  vehiclePartId?: string | null;
  status: ManufacturerRepairRuleStatus;
  allowed: boolean;
  mandatory: boolean;
  comment?: string | null;
  repairType: RepairType;
  vehiclePart?: VehiclePart | null;
  manufacturer?: Manufacturer;
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
  isActive: boolean;
};

export type VehiclePart = {
  id: string;
  name: string;
  code: string;
  category?: string | null;
  displayOrder: number;
  isActive: boolean;
};

export type DamagePhoto = {
  id?: string;
  publicId: string;
  assetId?: string | null;
  secureUrl: string;
  width: number;
  height: number;
  bytes: number;
  format: string;
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
  licensePlateRaw?: string | null;
  licensePlateCountry: string;
  licensePlateRecognitionConfidence?: number | null;
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
    operationalStatus: VehicleCheckItemOperationalStatus;
    operationalComment?: string | null;
    statusHistories?: Array<{
      id: string;
      fromStatus: VehicleCheckItemOperationalStatus;
      toStatus: VehicleCheckItemOperationalStatus;
      comment?: string | null;
      createdAt: string;
      user?: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
      } | null;
    }>;
    photos?: DamagePhoto[];
    decisionStatus: RepairDecisionStatus;
    decisionMessage?: string | null;
    repairType: RepairType;
    vehiclePart: VehiclePart;
  }>;
};

export type RepairDecisionInputItem = {
  repairTypeId: string;
  vehiclePartId?: string;
  quantity: number;
  comment?: string;
  partOrderRequired?: boolean;
  photos?: DamagePhoto[];
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
    vehiclePartId: string;
    vehiclePartCode: string;
    vehiclePartName: string;
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
    vehiclePartId?: string | null;
    vehiclePartCode?: string | null;
    vehiclePartName?: string | null;
    message: string;
  }>;
  recommendedRepairTypes?: Array<{
    repairTypeId: string;
    repairTypeCode: string;
    repairTypeName: string;
    vehiclePartId?: string | null;
    vehiclePartCode?: string | null;
    vehiclePartName?: string | null;
    message: string;
  }>;
};

export type VehicleCheckItem = NonNullable<VehicleCheck["items"]>[number];

export type CreateVehicleCheckPayload = {
  agencyId: string;
  manufacturerId: string;
  vehicleModelId?: string;
  licensePlate: string;
  licensePlateCountry?: string;
  licensePlateRecognitionConfidence?: number;
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
