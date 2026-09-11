import { api } from "@/lib/api";
import { Departure, DepartureHistory, DeparturePriority, DepartureStatus, InterventionType, Provider, ProviderType, VehicleSearchResult } from "@/types/departures";
import { Agency } from "@/types/business";

export type CreateDepartureInput = {
  agencyId: string; registration: string; brand?: string; model?: string; providerId: string; interventionType: InterventionType;
  description?: string; priority?: DeparturePriority; appointmentAt?: string; plannedDepartureAt?: string; estimatedReturnAt?: string;
};

export const departuresService = {
  async agencies() { return (await api.get<Agency[]>("/agencies/accessible/me")).data; },
  async active(agencyId: string) { return (await api.get<Departure[]>("/departures/active", { params: { agencyId } })).data; },
  async one(id: string) { return (await api.get<Departure>(`/departures/${id}`)).data; },
  async history(agencyId: string, registration = "") { return (await api.get<{ items: Departure[]; total: number }>("/departures/history", { params: { agencyId, registration } })).data; },
  async create(input: CreateDepartureInput) { return (await api.post<Departure>("/departures", input)).data; },
  async changeProvider(id: string, providerId: string) { return (await api.patch<Departure>(`/departures/${id}/provider`, { providerId })).data; },
  async changeStatus(id: string, status: DepartureStatus) { return (await api.patch<Departure>(`/departures/${id}/status`, { status })).data; },
  async ready(id: string) { return (await api.post<Departure>(`/departures/${id}/ready`, {})).data; },
  async returnVehicle(id: string, at?: string) { return (await api.post<Departure>(`/departures/${id}/return`, { at })).data; },
  async comment(id: string, message: string) { return (await api.post<DepartureHistory>(`/departures/${id}/comments`, { message })).data; },
  async searchVehicles(agencyId: string, registration: string) { return (await api.get<VehicleSearchResult[]>("/vehicles/search", { params: { agencyId, registration } })).data; },
  async providers(agencyId: string, includeInactive = false) { return (await api.get<Provider[]>("/providers", { params: { agencyId, includeInactive } })).data; },
  async createProvider(input: { agencyId: string; name: string; type: ProviderType; displayOrder?: number }) { return (await api.post<Provider>("/providers", input)).data; },
  async updateProvider(id: string, input: Partial<Provider>) { return (await api.patch<Provider>(`/providers/${id}`, input)).data; },
};
