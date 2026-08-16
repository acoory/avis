import { Agency, Manufacturer } from "@/types/business";
import {
  ConversationAttachment,
  ConversationUser,
} from "@/types/conversations";

export type RiskVehicleStatus = "DRAFT" | "SUBMITTED" | "CLOSED";
export type RiskAssignmentRole = "PRIMARY" | "PARTICIPANT";
export type RiskPhotoCategory =
  | "EXTERIOR_FRONT_THREE_QUARTER"
  | "EXTERIOR_REAR_THREE_QUARTER"
  | "DASHBOARD"
  | "INTERIOR_FRONT"
  | "INTERIOR_REAR"
  | "TRUNK"
  | "WHEEL_FRONT_LEFT"
  | "WHEEL_FRONT_RIGHT"
  | "WHEEL_REAR_LEFT"
  | "WHEEL_REAR_RIGHT"
  | "TIRE_WEAR"
  | "TIRE_DAMAGE"
  | "DAMAGE_WIDE"
  | "DAMAGE_CLOSE_UP";

export type RiskPhoto = {
  assetId?: string | null;
  bytes: number;
  category: RiskPhotoCategory;
  createdAt: string;
  damageGroupId?: string | null;
  format: string;
  height: number;
  id: string;
  publicId: string;
  riskVehicleId: string;
  secureUrl: string;
  slotKey: string;
  sortOrder: number;
  width: number;
};

export type RiskAssignment = {
  assignedAt: string;
  id: string;
  role: RiskAssignmentRole;
  user: ConversationUser & { email: string; isActive: boolean };
  userId: string;
};

export type RiskMessage = {
  attachments: ConversationAttachment[];
  author: ConversationUser | null;
  authorId?: string | null;
  body?: string | null;
  createdAt: string;
  id: string;
};

export type RiskVehicle = {
  agency: Agency;
  agencyId: string;
  assignments: RiskAssignment[];
  closedAt?: string | null;
  closedBy?: ConversationUser | null;
  conversation?: {
    createdAt: string;
    id: string;
    messages: RiskMessage[];
    updatedAt: string;
  } | null;
  createdAt: string;
  creator: ConversationUser & { email: string; isActive: boolean };
  creatorId: string;
  id: string;
  licensePlate: string;
  licensePlateCountry: string;
  licensePlateRaw?: string | null;
  licensePlateRecognitionConfidence?: number | null;
  manufacturer: Manufacturer;
  manufacturerId: string;
  photos: RiskPhoto[];
  riskNumber: string;
  status: RiskVehicleStatus;
  submittedAt?: string | null;
  updatedAt: string;
};

export type CreateRiskVehiclePayload = {
  agencyId: string;
  assigneeIds: string[];
  licensePlate: string;
  licensePlateCountry?: string;
  licensePlateRecognitionConfidence?: number;
  manufacturerId: string;
  primaryAssigneeId: string;
};

export type RiskAssignee = ConversationUser & { email: string };

export type RiskVehicleSearchResult = Pick<
  RiskVehicle,
  | "createdAt"
  | "creatorId"
  | "id"
  | "licensePlate"
  | "licensePlateCountry"
  | "licensePlateRaw"
  | "riskNumber"
  | "status"
  | "updatedAt"
> & {
  agency: Pick<Agency, "city" | "id" | "name">;
  manufacturer: Pick<Manufacturer, "id" | "name">;
};
