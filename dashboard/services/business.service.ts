import { api } from "@/lib/api";
import { cloudinaryImageUrl } from "@/lib/damage-photo";
import {
  Agency,
  DashboardSummary,
  DamagePhoto,
  Manufacturer,
  ManufacturerRepairRule,
  ManufacturerRepairRuleStatus,
  RepairType,
  CreateVehicleCheckPayload,
  RepairDecisionInputItem,
  RepairDecisionPreview,
  VehicleCheck,
  VehicleCheckItem,
  VehicleCheckItemOperationalStatus,
  VehicleModel,
  VehiclePart,
} from "@/types/business";

type PeriodParams = {
  dateFrom?: string;
  dateTo?: string;
};

export const businessService = {
  async dashboardSummary(params?: PeriodParams) {
    const { data } = await api.get<DashboardSummary>("/dashboard/summary", { params });
    return data;
  },

  async savingsByManufacturer(params?: PeriodParams) {
    const { data } = await api.get<
      Array<{
        manufacturerId: string;
        manufacturerName: string;
        vehicleChecksCount: number;
        totalInternalSavingAmount: string;
        totalInternalCost: string;
        allowanceDifferenceAmount: string;
      }>
    >("/dashboard/savings-by-manufacturer", { params });
    return data;
  },

  async savingsByCollaborator(params?: PeriodParams) {
    const { data } = await api.get<
      Array<{
        collaboratorId: string;
        collaboratorName: string;
        collaboratorEmail: string | null;
        vehicleChecksCount: number;
        totalInternalSavingAmount: string;
        totalInternalCost: string;
      }>
    >("/dashboard/savings-by-collaborator", { params });
    return data;
  },

  async repairTypeFrequency(params?: PeriodParams) {
    const { data } = await api.get<
      Array<{
        repairTypeId: string;
        repairTypeCode: string | null;
        repairTypeName: string;
        decisionStatus: string;
        linesCount: number;
        quantity: number;
        totalInternalSavingAmount: string;
        totalInternalCost: string;
      }>
    >("/dashboard/repair-type-frequency", { params });
    return data;
  },

  async vehicleChecks(params?: PeriodParams) {
    const { data } = await api.get<VehicleCheck[]>("/vehicle-checks", { params });
    return data;
  },

  async vehicleCheck(id: string) {
    const { data } = await api.get<VehicleCheck>(`/vehicle-checks/${id}`);
    return data;
  },

  async createVehicleCheck(payload: CreateVehicleCheckPayload) {
    const { data } = await api.post<VehicleCheck>("/vehicle-checks", payload);
    return data;
  },

  async updateVehicleCheck(id: string, payload: CreateVehicleCheckPayload) {
    const { data } = await api.patch<VehicleCheck>(`/vehicle-checks/${id}`, payload);
    return data;
  },

  async completeVehicleCheck(id: string) {
    const { data } = await api.post<VehicleCheck>(`/vehicle-checks/${id}/complete`);
    return data;
  },

  async deleteVehicleCheck(id: string) {
    const { data } = await api.delete<{ success: true }>(`/vehicle-checks/${id}`);
    return data;
  },

  async updatePartOrder(
    id: string,
    payload: {
      partOrderRequired?: boolean;
      partOrderStatus?: "NOT_REQUIRED" | "TO_ORDER" | "ORDERED";
      partOrderPrice?: number;
      partOrderReference?: string;
    },
  ) {
    const { data } = await api.patch<VehicleCheckItem>(`/vehicle-check-items/${id}/part-order`, payload);
    return data;
  },

  async updateVehicleCheckItemOperationalStatus(
    id: string,
    payload: {
      operationalStatus: VehicleCheckItemOperationalStatus;
      operationalComment?: string;
    },
  ) {
    const { data } = await api.patch<VehicleCheckItem>(`/vehicle-check-items/${id}/operational-status`, payload);
    return data;
  },

  async previewDecision(payload: { manufacturerId: string; items: RepairDecisionInputItem[] }) {
    const { data } = await api.post<RepairDecisionPreview>("/vehicle-checks/preview-decision", payload);
    return data;
  },

  async recognizeLicensePlate(image: Blob) {
    const formData = new FormData();
    formData.append("image", image, "plate.jpg");
    const { data } = await api.post<{
      detected: boolean;
      plate?: string;
      confidence?: number;
      region?: string | null;
      regionConfidence?: number | null;
      detectionConfidence?: number;
    }>("/license-plates/recognize", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 15000,
    });
    return data;
  },

  async damagePhotoUploadSignature() {
    const { data } = await api.post<{
      apiKey: string;
      cloudName: string;
      folder: string;
      publicId: string;
      timestamp: number;
      signature: string;
      uploadUrl: string;
    }>("/damage-photos/upload-signature");
    return data;
  },

  async uploadDamagePhoto(file: File) {
    const signature = await this.damagePhotoUploadSignature();
    const formData = new FormData();
    formData.append("file", file);
    formData.append("api_key", signature.apiKey);
    formData.append("folder", signature.folder);
    formData.append("overwrite", "false");
    formData.append("public_id", signature.publicId);
    formData.append("signature", signature.signature);
    formData.append("timestamp", String(signature.timestamp));

    const response = await fetch(signature.uploadUrl, { method: "POST", body: formData });
    if (!response.ok) throw new Error("Cloudinary upload failed");
    const uploaded = (await response.json()) as {
      asset_id?: string;
      public_id: string;
      secure_url: string;
      width: number;
      height: number;
      bytes: number;
      format: string;
    };

    return {
      assetId: uploaded.asset_id,
      publicId: uploaded.public_id,
      secureUrl: cloudinaryImageUrl(uploaded.secure_url),
      width: uploaded.width,
      height: uploaded.height,
      bytes: uploaded.bytes,
      format: uploaded.format,
    } satisfies DamagePhoto;
  },

  async deleteDamagePhoto(publicId: string) {
    const { data } = await api.delete<{ success: boolean }>("/damage-photos", {
      data: { publicId },
    });
    return data;
  },

  async agencies() {
    const { data } = await api.get<Agency[]>("/agencies");
    return data;
  },

  async manufacturers() {
    const { data } = await api.get<Manufacturer[]>("/manufacturers");
    return data;
  },

  async vehicleModels(manufacturerId?: string) {
    const { data } = await api.get<VehicleModel[]>("/vehicle-models", { params: { manufacturerId } });
    return data;
  },

  async repairTypes() {
    const { data } = await api.get<RepairType[]>("/repair-types");
    return data;
  },

  async createRepairType(payload: {
    code: string;
    name: string;
    defaultInternalSavingAmount: string;
    isActive?: boolean;
  }) {
    const { data } = await api.post<RepairType>("/repair-types", payload);
    return data;
  },

  async updateRepairType(
    id: string,
    payload: {
      code?: string;
      name?: string;
      defaultInternalSavingAmount?: string;
      isActive?: boolean;
    },
  ) {
    const { data } = await api.patch<RepairType>(`/repair-types/${id}`, payload);
    return data;
  },

  async vehicleParts() {
    const { data } = await api.get<VehiclePart[]>("/vehicle-parts");
    return data;
  },

  async createManufacturerRepairRule(
    manufacturerId: string,
    payload: {
      repairTypeId: string;
      vehiclePartId?: string;
      status: ManufacturerRepairRuleStatus;
    },
  ) {
    const { data } = await api.post<ManufacturerRepairRule>(
      `/manufacturers/${manufacturerId}/repair-rules`,
      payload,
    );
    return data;
  },

  async updateManufacturerRepairRule(
    id: string,
    payload: {
      status: ManufacturerRepairRuleStatus;
    },
  ) {
    const { data } = await api.patch<ManufacturerRepairRule>(`/manufacturer-repair-rules/${id}`, payload);
    return data;
  },
};

export function exportVehicleChecksUrl(params?: {
  collaboratorId?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const url = new URL(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/exports/vehicle-checks.xlsx`);

  if (params?.collaboratorId) {
    url.searchParams.set("collaboratorId", params.collaboratorId);
  }

  if (params?.dateFrom) {
    url.searchParams.set("dateFrom", params.dateFrom);
  }

  if (params?.dateTo) {
    url.searchParams.set("dateTo", params.dateTo);
  }

  return url.toString();
}
