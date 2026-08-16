import { api } from "@/lib/api";
import {
  ConversationAttachment,
  ConversationUploadSignature,
} from "@/types/conversations";
import {
  CreateRiskVehiclePayload,
  RiskAssignee,
  RiskPhoto,
  RiskPhotoCategory,
  RiskVehicle,
  RiskVehicleSearchResult,
} from "@/types/risk";

type ImageUploadSignature = {
  apiKey: string;
  cloudName: string;
  folder: string;
  publicId: string;
  signature: string;
  timestamp: number;
  uploadUrl: string;
};

export const riskService = {
  async list() {
    const { data } = await api.get<RiskVehicle[]>("/risk-vehicles");
    return data;
  },

  async search(query: string, limit = 8, signal?: AbortSignal) {
    const { data } = await api.get<RiskVehicleSearchResult[]>(
      "/risk-vehicles/search",
      {
        params: { limit, q: query },
        signal,
      },
    );
    return data;
  },

  async assignees() {
    const { data } = await api.get<RiskAssignee[]>("/risk-vehicles/assignees");
    return data;
  },

  async findOne(id: string) {
    const { data } = await api.get<RiskVehicle>(`/risk-vehicles/${id}`);
    return data;
  },

  async create(payload: CreateRiskVehiclePayload) {
    const { data } = await api.post<RiskVehicle>("/risk-vehicles", payload);
    return data;
  },

  async updateAssignments(
    id: string,
    payload: { assigneeIds: string[]; primaryAssigneeId: string },
  ) {
    const { data } = await api.patch<RiskVehicle>(
      `/risk-vehicles/${id}`,
      payload,
    );
    return data;
  },

  async submit(id: string) {
    const { data } = await api.post<RiskVehicle>(
      `/risk-vehicles/${id}/submit`,
      {},
    );
    return data;
  },

  async close(id: string) {
    const { data } = await api.post<RiskVehicle>(
      `/risk-vehicles/${id}/close`,
      {},
    );
    return data;
  },

  async uploadPhoto(
    id: string,
    file: File,
    input: {
      category: RiskPhotoCategory;
      damageGroupId?: string;
      slotKey: string;
      sortOrder?: number;
    },
  ) {
    const { data: signature } = await api.post<ImageUploadSignature>(
      `/risk-vehicles/${id}/photos/upload-signature`,
      {},
    );
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
      bytes: number;
      format: string;
      height: number;
      public_id: string;
      secure_url: string;
      width: number;
    };
    const { data } = await api.post<RiskPhoto>(`/risk-vehicles/${id}/photos`, {
      assetId: uploaded.asset_id,
      bytes: uploaded.bytes,
      category: input.category,
      damageGroupId: input.damageGroupId,
      format: uploaded.format,
      height: uploaded.height,
      publicId: uploaded.public_id,
      secureUrl: uploaded.secure_url,
      slotKey: input.slotKey,
      sortOrder: input.sortOrder,
      width: uploaded.width,
    });
    return data;
  },

  async removePhoto(id: string, photoId: string) {
    await api.delete(`/risk-vehicles/${id}/photos/${photoId}`);
  },

  async uploadAttachment(id: string, file: File) {
    const { data: signature } = await api.post<ConversationUploadSignature>(
      `/risk-vehicles/${id}/conversation/attachment-signature`,
      {},
    );
    if (file.size > signature.maxFileSize)
      throw new Error("Le fichier depasse 10 Mo.");
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
    if (!response.ok) throw new Error("Le document n'a pas pu etre envoye.");
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
      mimeType: file.type || "application/octet-stream",
      originalName: file.name,
      publicId: uploaded.public_id,
      resourceType: uploaded.resource_type,
      secureUrl: uploaded.secure_url,
    } satisfies ConversationAttachment;
  },

  async createMessage(
    id: string,
    payload: { attachments?: ConversationAttachment[]; body?: string },
  ) {
    const { data } = await api.post<RiskVehicle>(
      `/risk-vehicles/${id}/conversation/messages`,
      payload,
    );
    return data;
  },
};
