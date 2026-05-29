import { api } from "@/lib/api";
import {
  Agency,
  DashboardSummary,
  Manufacturer,
  RepairType,
  CreateVehicleCheckPayload,
  RepairDecisionInputItem,
  RepairDecisionPreview,
  VehicleCheck,
  VehicleCheckItem,
  VehicleModel,
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

  async previewDecision(payload: { manufacturerId: string; items: RepairDecisionInputItem[] }) {
    const { data } = await api.post<RepairDecisionPreview>("/vehicle-checks/preview-decision", payload);
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
};

export function exportVehicleChecksUrl() {
  return `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/exports/vehicle-checks.xlsx`;
}
