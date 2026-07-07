export type VehicleCheckStatus = "DRAFT" | "TO_ANALYZE" | "SUMMARY_READY" | "CANCELLED";
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
  fieldCompletedAt?: string | null;
  summaryFinalizedAt?: string | null;
  collaborator?: {
    firstName: string;
    lastName: string;
    email: string;
  };
  agency?: Agency;
  manufacturer?: Manufacturer;
  vehicleModel?: VehicleModel | null;
  publicShare?: {
    createdAt: string;
    externalRepairContact?: ExternalRepairContact | null;
    externalRepairContactId?: string | null;
    takenInChargeAt?: string | null;
    vehicleRecoveredAt?: string | null;
    vehicleRecoveredBy?: {
      email: string;
      firstName: string;
      id: string;
      lastName: string;
    } | null;
    vehicleRecoveredById?: string | null;
    token: string;
  } | null;
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
    selectedForSummary: boolean;
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

export type ExternalRepairContact = {
  id: string;
  name: string;
  company?: ExternalRepairCompany | null;
  companyId?: string | null;
  companyName?: string | null;
  email: string;
  phone?: string | null;
  notes?: string | null;
  isActive: boolean;
};

export type ExternalRepairCompany = {
  id: string;
  name: string;
  notes?: string | null;
  isActive: boolean;
  contacts?: ExternalRepairContact[];
};

export type VehicleCheckPublicShare = {
  createdAt: string;
  externalRepairContact?: ExternalRepairContact | null;
  externalRepairContactId?: string | null;
  takenInChargeAt?: string | null;
  vehicleRecoveredAt?: string | null;
  token: string;
};

export type PublicVehicleCheckShare = {
  createdAt: string;
  externalRepairContact?: ExternalRepairContact | null;
  externalRepairContactId?: string | null;
  takenInChargeAt?: string | null;
  vehicleRecoveredAt?: string | null;
  token: string;
  vehicleCheck: Omit<VehicleCheck, "collaborator" | "externalQuotes" | "items"> & {
    items: VehicleCheckItem[];
  };
};

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
  vehicleChecksToAnalyzeCount: number;
  draftVehicleChecksCount: number;
  totalInternalSavingAmount: string;
  totalInternalCost: string;
  totalExternalCost: string;
  totalDifferenceAmount: string;
  alertItemsCount: number;
  partOrdersToPlaceCount?: number;
  repairRequestNotifications?: Array<{
    eventAt: string;
    externalRepairContact?: ExternalRepairContact | null;
    id: string;
    type: "TAKEN_IN_CHARGE" | "VEHICLE_RECOVERED";
    vehicleCheck: Pick<
      VehicleCheck,
      | "id"
      | "checkNumber"
      | "licensePlate"
      | "licensePlateCountry"
      | "licensePlateRaw"
      | "checkDate"
      | "city"
      | "agency"
      | "manufacturer"
      | "vehicleModel"
    >;
  }>;
  recentVehicleChecks: VehicleCheck[];
};

export type DashboardTimelinePoint = {
  alertItemsCount: number;
  completedVehicleChecksCount: number;
  date: string;
  draftVehicleChecksCount: number;
  partOrdersToPlaceCount: number;
  totalDifferenceAmount: string;
  totalInternalCost: string;
  totalInternalSavingAmount: string;
  vehicleChecksCount: number;
  vehicleChecksToAnalyzeCount: number;
};

export type GtmotiveEstimate = {
  estimateId: number;
  code?: string;
  securityProfileId?: number;
  source?: "created" | "fallback";
};

export type GtmotiveVehicle = {
  make: string | null;
  model: string | null;
  version: string | null;
  registrationNumber: string | null;
  vin: string | null;
  makeCode: string | null;
  modelId: string | null;
  navigationModelCode: string | null;
  equipment: string | null;
  label: string | null;
};

export type GtmotiveVehicleIdentification = {
  estimateId: number;
  securityProfileId?: number;
  vehicle: GtmotiveVehicle;
  ready: boolean;
  warnings: string[];
};

export type GtmotivePart = {
  id: string;
  label: string;
  partNumber?: string;
  canReplace: boolean;
  operations: Array<{
    id: number;
    label: string;
    available: boolean;
  }>;
};

export type GtmotivePartsResponse = {
  groups: Array<{
    id: string;
    label: string;
    selected: boolean;
  }>;
  parts: GtmotivePart[];
};

export type GtmotiveNavigationBoard = {
  id: number | null;
  description: string | null;
  svgUrl: string | null;
  images: Array<{
    width: number | null;
    url: string | null;
  }>;
  functionalGroups: Array<{
    id: string;
    description: string;
  }>;
  fallback: boolean;
  message: string | null;
};

export type GtmotiveGraphicZone = {
  groupId: string;
  available: boolean;
  message?: string;
  parts?: Array<{
    partCode?: string;
    description?: string;
    imgId?: string;
  }>;
  imgs?: Array<{
    id?: number | null;
    url?: string | null;
    svgImage?: string;
    positionX?: number;
    positionY?: number;
    rotation?: number;
    scale?: number;
    order?: number;
    gradient?: unknown;
    state?: unknown;
    situation?: unknown;
    parts?: unknown[];
  }>;
  metadata?: {
    navigationModelCode?: string;
    modelId?: string;
    equipments?: string[];
    manufacturingValues?: string[];
  };
};

export type GtmotiveOperationResult = {
  operationId: number;
  actionId: number;
  operation: string;
  part: {
    id: string;
    label: string;
  };
  reference: string | null;
  oemReference: string | null;
  oemPrice: number | null;
  partPrice: number | null;
  labourTime: number | null;
  labourRate: number | null;
  labourRateLabel: string | null;
  labourAmount: number | null;
  ingredientsAmount: number | null;
  total: number | null;
  precalculation: string | null;
  job: string | null;
  technicity: string | null;
  currency: "EUR";
  replacedOperation?: {
    operationId: number;
    actionId: number;
    operation: string;
    part: {
      id: string;
      label: string;
    };
  } | null;
  children: Array<{
    operationId: number;
    actionId: number;
    operation: string;
    reference: string | null;
    partPrice: number | null;
    labourTime: number | null;
    labourAmount: number | null;
    total: number | null;
  }>;
};

export type GtmotiveReplaceResult = GtmotiveOperationResult;
