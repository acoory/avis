import { api } from "@/lib/api";
import {
  Agency,
  DashboardSummary,
  DashboardTimelinePoint,
  DamagePhoto,
  DecisionManager,
  ExternalRepairContact,
  ExternalRepairCompany,
  GtmotiveEstimate,
  GtmotiveGraphicZone,
  GtmotiveNavigationBoard,
  GtmotiveOperationResult,
  GtmotivePart,
  GtmotivePartsResponse,
  GtmotiveVehicleIdentification,
  Manufacturer,
  ManufacturerRepairRule,
  ManufacturerRepairRuleStatus,
  RepairType,
  CreateVehicleCheckPayload,
  RepairDecisionInputItem,
  RepairDecisionPreview,
  VehicleCheck,
  VehicleCheckDecisionShare,
  VehicleCheckItem,
  VehicleCheckItemOperationalStatus,
  VehicleCheckPublicShare,
  VehicleModel,
  VehiclePart,
  PublicVehicleCheckDecisionShare,
  PublicVehicleCheckShare,
} from "@/types/business";
import {
  ConversationAttachment,
  ConversationStatus,
  ConversationUploadSignature,
  NotificationsResponse,
  PublicDecisionAccessStatus,
  VehicleCheckConversationContext,
} from "@/types/conversations";

type PeriodParams = {
  collaboratorId?: string;
  dateFrom?: string;
  dateTo?: string;
};

export const businessService = {
  async dashboardSummary(params?: PeriodParams) {
    const { data } = await api.get<DashboardSummary>("/dashboard/summary", {
      params,
    });
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

  async externalRepairContacts() {
    const { data } = await api.get<ExternalRepairContact[]>(
      "/external-repair-contacts",
    );
    return data;
  },

  async externalRepairCompanies() {
    const { data } = await api.get<ExternalRepairCompany[]>(
      "/external-repair-contacts/companies",
    );
    return data;
  },

  async decisionManagers(vehicleCheckId?: string) {
    const { data } = await api.get<DecisionManager[]>(
      "/vehicle-checks/decision-managers",
      {
        params: vehicleCheckId ? { vehicleCheckId } : undefined,
      },
    );
    return data;
  },

  async findOrCreateExternalRepairContact(payload: {
    companyName?: string;
    email: string;
    name: string;
    notes?: string;
    phone?: string;
  }) {
    const { data } = await api.post<ExternalRepairContact>(
      "/external-repair-contacts/find-or-create",
      payload,
    );
    return data;
  },

  async createVehicleCheckPublicShare(
    id: string,
    payload?: { externalRepairContactId?: string },
  ) {
    const { data } = await api.post<VehicleCheckPublicShare>(
      `/vehicle-checks/${id}/public-share`,
      payload ?? {},
    );
    return data;
  },

  async sendVehicleCheckRepairRequestEmail(
    id: string,
    payload: {
      companyName?: string;
      companyId?: string;
      recipients: Array<{
        email?: string;
        id?: string;
        name?: string;
      }>;
    },
  ) {
    const { data } = await api.post<
      VehicleCheckPublicShare & {
        emailSentAt: string;
        recipientEmail: string;
        recipientEmails: string[];
      }
    >(`/vehicle-checks/${id}/repair-request-email`, payload);
    return data;
  },

  async markVehicleRecovered(id: string) {
    const { data } = await api.post<VehicleCheck>(
      `/vehicle-checks/${id}/public-share/recovered`,
      {},
    );
    return data;
  },

  async sendVehicleCheckDecisionRequestEmail(
    id: string,
    payload: {
      managerId: string;
      requestComment?: string;
    },
  ) {
    const { data } = await api.post<VehicleCheckDecisionShare>(
      `/vehicle-checks/${id}/decision-request-email`,
      payload,
    );
    return data;
  },

  async publicVehicleCheckShare(token: string) {
    const { data } = await api.get<PublicVehicleCheckShare>(
      `/public/vehicle-checks/${token}`,
    );
    return data;
  },

  async publicVehicleCheckDecisionShare(token: string) {
    const { data } = await api.get<PublicVehicleCheckDecisionShare>(
      `/public/vehicle-checks/decision/${token}`,
    );
    return data;
  },

  async publicDecisionAccess(token: string) {
    const { data } = await api.get<PublicDecisionAccessStatus>(
      `/public/decision-access/${token}`,
    );
    return data;
  },

  async verifyPublicDecisionAccessCode(token: string, code: string) {
    const { data } = await api.post<PublicDecisionAccessStatus>(
      `/public/decision-access/${token}/verify`,
      { code },
    );
    return data;
  },

  async sendPublicDecisionAccessCode(token: string) {
    const { data } = await api.post<{ maskedEmail: string; success: boolean }>(
      `/public/decision-access/${token}/send-code`,
      {},
    );
    return data;
  },

  async forgetPublicDecisionAccess(token: string) {
    const { data } = await api.post<PublicDecisionAccessStatus>(
      `/public/decision-access/${token}/forget`,
      {},
    );
    return data;
  },

  async takeChargePublicVehicleCheckShare(token: string) {
    const { data } = await api.post<PublicVehicleCheckShare>(
      `/public/vehicle-checks/${token}/take-charge`,
      {},
    );
    return data;
  },

  async dashboardTimeline(params?: PeriodParams) {
    const { data } = await api.get<DashboardTimelinePoint[]>(
      "/dashboard/timeline",
      { params },
    );
    return data;
  },

  async createGtmotiveEstimate() {
    const { data } = await api.post<GtmotiveEstimate>(
      "/api/gtmotive/estimate",
      {},
    );
    return data;
  },

  async identifyGtmotiveVehicle(payload: {
    estimateId: number;
    securityProfileId?: number;
    registrationNumber?: string;
    vin?: string;
  }) {
    const { data } = await api.post<GtmotiveVehicleIdentification>(
      "/api/gtmotive/identify-vehicle",
      payload,
    );
    return data;
  },

  async gtmotiveNavigationBoard(
    estimateId: number,
    params: {
      securityProfileId?: number;
      makeCode?: string | null;
      modelId?: string | null;
      navigationModelCode?: string | null;
      equipment?: string | null;
    },
  ) {
    const { data } = await api.get<GtmotiveNavigationBoard>(
      `/api/gtmotive/estimates/${estimateId}/navigation-board`,
      {
        params,
      },
    );
    return data;
  },

  async gtmotiveNavigationBoardSvg(svgUrl: string) {
    const { data } = await api.get<string>(svgUrl, { responseType: "text" });
    return data;
  },

  async gtmotiveNavigationBoardImage(imageUrl: string) {
    const { data } = await api.get<Blob>(imageUrl, { responseType: "blob" });
    return data;
  },

  async selectGtmotiveGroup(
    estimateId: number,
    payload: { groupId: string; securityProfileId?: number },
  ) {
    const { data } = await api.post<{
      estimateId: number;
      selectedGroup: { id: string; label: string };
    }>(`/api/gtmotive/estimates/${estimateId}/select-group`, payload);
    return data;
  },

  async gtmotiveParts(
    estimateId: number,
    securityProfileId?: number,
    groupId?: string,
  ) {
    const { data } = await api.get<GtmotivePartsResponse>(
      `/api/gtmotive/estimates/${estimateId}/parts`,
      {
        params: { securityProfileId, groupId },
      },
    );
    return data;
  },

  async gtmotiveGraphicZone(
    estimateId: number,
    groupId: string,
    params: {
      securityProfileId?: number;
      makeCode?: string | null;
      modelId?: string | null;
      navigationModelCode?: string | null;
      equipment?: string | null;
    },
  ) {
    const { data } = await api.get<GtmotiveGraphicZone>(
      `/api/gtmotive/estimates/${estimateId}/graphic-zone/${groupId}`,
      {
        params,
      },
    );
    return data;
  },

  async addGtmotivePartOperation(
    estimateId: number,
    part: GtmotivePart,
    payload: {
      relatedPartType?: number;
      securityProfileId?: number;
      taskType: number;
    },
  ) {
    const { data } = await api.post<GtmotiveOperationResult>(
      `/api/gtmotive/estimates/${estimateId}/operations`,
      {
        partCode: part.id,
        partDescription: part.label,
        ...payload,
      },
    );
    return data;
  },

  async switchGtmotivePartOperation(
    estimateId: number,
    part: GtmotivePart,
    payload: {
      relatedPartType?: number;
      securityProfileId?: number;
      taskType: number;
    },
  ) {
    const { data } = await api.post<GtmotiveOperationResult>(
      `/api/gtmotive/estimates/${estimateId}/operations/switch`,
      {
        partCode: part.id,
        partDescription: part.label,
        ...payload,
      },
    );
    return data;
  },

  async replaceGtmotivePart(
    estimateId: number,
    part: GtmotivePart,
    securityProfileId?: number,
  ) {
    return this.addGtmotivePartOperation(estimateId, part, {
      securityProfileId,
      taskType: 1,
    });
  },

  async vehicleChecks(params?: PeriodParams) {
    const { data } = await api.get<VehicleCheck[]>("/vehicle-checks", {
      params,
    });
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

  async checkVehicleCheckDuplicate(payload: {
    excludedVehicleCheckId?: string;
    licensePlate: string;
    licensePlateCountry?: string;
  }) {
    const { data } = await api.post<{
      exists: boolean;
      existingVehicleCheck?: {
        checkDate: string;
        checkNumber: string;
        id: string;
        status: string;
      };
    }>("/vehicle-checks/duplicate-check", payload);
    return data;
  },

  async updateVehicleCheck(id: string, payload: CreateVehicleCheckPayload) {
    const { data } = await api.patch<VehicleCheck>(
      `/vehicle-checks/${id}`,
      payload,
    );
    return data;
  },

  async completeVehicleCheck(id: string) {
    const { data } = await api.post<VehicleCheck>(
      `/vehicle-checks/${id}/complete`,
    );
    return data;
  },

  async finalizeVehicleCheckSummary(id: string, selectedItemIds: string[]) {
    const { data } = await api.post<VehicleCheck>(
      `/vehicle-checks/${id}/finalize-summary`,
      {
        selectedItemIds,
      },
    );
    return data;
  },

  async deleteVehicleCheck(id: string) {
    const { data } = await api.delete<{ success: true }>(
      `/vehicle-checks/${id}`,
    );
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
    const { data } = await api.patch<VehicleCheckItem>(
      `/vehicle-check-items/${id}/part-order`,
      payload,
    );
    return data;
  },

  async updateVehicleCheckItemOperationalStatus(
    id: string,
    payload: {
      operationalStatus: VehicleCheckItemOperationalStatus;
      operationalComment?: string;
    },
  ) {
    const { data } = await api.patch<VehicleCheckItem>(
      `/vehicle-check-items/${id}/operational-status`,
      payload,
    );
    return data;
  },

  async previewDecision(payload: {
    manufacturerId: string;
    items: RepairDecisionInputItem[];
  }) {
    const { data } = await api.post<RepairDecisionPreview>(
      "/vehicle-checks/preview-decision",
      payload,
    );
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

    const response = await fetch(signature.uploadUrl, {
      method: "POST",
      body: formData,
    });
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
      secureUrl: uploaded.secure_url,
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

  async vehicleCheckConversation(id: string) {
    const { data } = await api.get<VehicleCheckConversationContext>(
      `/vehicle-checks/${id}/conversation`,
    );
    return data;
  },

  async publicVehicleCheckConversation(token: string) {
    const { data } = await api.get<VehicleCheckConversationContext>(
      `/public/vehicle-check-conversations/${token}`,
    );
    return data;
  },

  async createVehicleCheckConversation(
    id: string,
    payload: {
      body: string;
      managerIds: string[];
      mentionedItemIds?: string[];
    },
  ) {
    const { data } = await api.post<VehicleCheckConversationContext>(
      `/vehicle-checks/${id}/conversation`,
      payload,
    );
    return data;
  },

  async createVehicleCheckConversationMessage(
    id: string,
    payload: {
      attachments?: ConversationAttachment[];
      body?: string;
      mentionedItemIds?: string[];
    },
  ) {
    const { data } = await api.post<VehicleCheckConversationContext>(
      `/vehicle-checks/${id}/conversation/messages`,
      payload,
    );
    return data;
  },

  async createPublicVehicleCheckConversationMessage(
    token: string,
    payload: {
      attachments?: ConversationAttachment[];
      body?: string;
      mentionedItemIds?: string[];
    },
  ) {
    const { data } = await api.post<VehicleCheckConversationContext>(
      `/public/vehicle-check-conversations/${token}/messages`,
      payload,
    );
    return data;
  },

  async updateVehicleCheckConversationParticipants(
    id: string,
    managerIds: string[],
  ) {
    const { data } = await api.patch<VehicleCheckConversationContext>(
      `/vehicle-checks/${id}/conversation/participants`,
      { managerIds },
    );
    return data;
  },

  async updateVehicleCheckConversationStatus(
    id: string,
    status: ConversationStatus,
  ) {
    const { data } = await api.patch<VehicleCheckConversationContext>(
      `/vehicle-checks/${id}/conversation/status`,
      { status },
    );
    return data;
  },

  async markVehicleCheckConversationRead(id: string) {
    const { data } = await api.post<{ success: boolean }>(
      `/vehicle-checks/${id}/conversation/read`,
      {},
    );
    return data;
  },

  async markPublicVehicleCheckConversationRead(token: string) {
    const { data } = await api.post<{ success: boolean }>(
      `/public/vehicle-check-conversations/${token}/read`,
      {},
    );
    return data;
  },

  async conversationAttachmentSignature(id: string) {
    const { data } = await api.post<ConversationUploadSignature>(
      `/vehicle-checks/${id}/conversation/attachment-signature`,
      {},
    );
    return data;
  },

  async publicConversationAttachmentSignature(token: string) {
    const { data } = await api.post<ConversationUploadSignature>(
      `/public/vehicle-check-conversations/${token}/attachment-signature`,
      {},
    );
    return data;
  },

  async uploadConversationAttachment(id: string, file: File) {
    const signature = await this.conversationAttachmentSignature(id);
    return uploadConversationFile(signature, file);
  },

  async uploadPublicConversationAttachment(token: string, file: File) {
    const signature = await this.publicConversationAttachmentSignature(token);
    return uploadConversationFile(signature, file);
  },

  async updatePublicVehicleCheckConversationStatus(
    token: string,
    status: ConversationStatus,
  ) {
    const { data } = await api.patch<VehicleCheckConversationContext>(
      `/public/vehicle-check-conversations/${token}/status`,
      { status },
    );
    return data;
  },

  async notifications(take = 12) {
    const { data } = await api.get<NotificationsResponse>("/notifications", {
      params: { take },
    });
    return data;
  },

  async markNotificationRead(id: string) {
    const { data } = await api.post<{ success: boolean }>(
      `/notifications/${id}/read`,
      {},
    );
    return data;
  },

  async markAllNotificationsRead() {
    const { data } = await api.post<{ success: boolean }>(
      "/notifications/read-all",
      {},
    );
    return data;
  },

  async agencies() {
    const { data } = await api.get<Agency[]>("/agencies");
    return data;
  },

  async createAgency(payload: {
    code: string;
    name: string;
    city: string;
    region: string;
  }) {
    const { data } = await api.post<Agency>("/agencies", payload);
    return data;
  },

  async updateAgency(
    id: string,
    payload: {
      code?: string;
      name?: string;
      city?: string;
      region?: string;
    },
  ) {
    const { data } = await api.patch<Agency>(`/agencies/${id}`, payload);
    return data;
  },

  async deleteAgency(id: string) {
    const { data } = await api.delete<{ success: true }>(`/agencies/${id}`);
    return data;
  },

  async manufacturers() {
    const { data } = await api.get<Manufacturer[]>("/manufacturers");
    return data;
  },

  async createManufacturer(payload: { name: string }) {
    const { data } = await api.post<Manufacturer>("/manufacturers", payload);
    return data;
  },

  async vehicleModels(manufacturerId?: string) {
    const { data } = await api.get<VehicleModel[]>("/vehicle-models", {
      params: { manufacturerId },
    });
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
    const { data } = await api.patch<RepairType>(
      `/repair-types/${id}`,
      payload,
    );
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
    const { data } = await api.patch<ManufacturerRepairRule>(
      `/manufacturer-repair-rules/${id}`,
      payload,
    );
    return data;
  },
};

async function uploadConversationFile(
  signature: ConversationUploadSignature,
  file: File,
) {
  if (file.size > signature.maxFileSize) {
    throw new Error("Le fichier depasse 10 Mo.");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("allowed_formats", signature.allowedFormats.join(","));
  formData.append("api_key", signature.apiKey);
  formData.append("folder", signature.folder);
  formData.append("overwrite", "false");
  formData.append("public_id", signature.publicId);
  formData.append("signature", signature.signature);
  formData.append("timestamp", String(signature.timestamp));

  const response = await fetch(signature.uploadUrl, {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    const cloudinaryMessage =
      error?.error?.message ?? response.headers.get("x-cld-error") ?? "";
    if (/invalid signature/i.test(cloudinaryMessage)) {
      throw new Error(
        "Signature Cloudinary invalide. Rechargez la page puis reessayez.",
      );
    }
    if (/timestamp/i.test(cloudinaryMessage)) {
      throw new Error(
        "La signature Cloudinary a expire. Rechargez la page puis reessayez.",
      );
    }
    if (/format/i.test(cloudinaryMessage)) {
      throw new Error("Ce format de document n'est pas accepte.");
    }
    throw new Error("Le document n'a pas pu etre envoye.");
  }
  const uploaded = (await response.json()) as {
    bytes: number;
    format?: string;
    public_id: string;
    resource_type: string;
    secure_url: string;
  };
  return {
    bytes: uploaded.bytes,
    format: uploaded.format,
    mimeType: file.type || mimeTypeForFile(file.name),
    originalName: file.name,
    publicId: uploaded.public_id,
    resourceType: uploaded.resource_type,
    secureUrl: uploaded.secure_url,
  } satisfies ConversationAttachment;
}

function mimeTypeForFile(name: string) {
  const extension = name.split(".").pop()?.toLowerCase();
  const types: Record<string, string> = {
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    jpeg: "image/jpeg",
    jpg: "image/jpeg",
    pdf: "application/pdf",
    png: "image/png",
    webp: "image/webp",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
  return (extension && types[extension]) || "application/octet-stream";
}

export function exportVehicleChecksUrl(params?: {
  collaboratorId?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const url = new URL(
    `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/exports/vehicle-checks.xlsx`,
  );

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
