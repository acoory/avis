export type ConversationStatus = "OPEN" | "RESOLVED" | "CLOSED";
export type ConversationParticipantRole =
  | "REQUESTER"
  | "DECISION_MAKER"
  | "OBSERVER";

export type ConversationUser = {
  email?: string;
  firstName: string;
  id: string;
  isActive?: boolean;
  lastName: string;
  role?: "ADMIN" | "MANAGER" | "COLLABORATOR";
};

export type ConversationAttachment = {
  bytes: number;
  format?: string | null;
  id?: string;
  mimeType: string;
  originalName: string;
  publicId: string;
  resourceType: string;
  secureUrl: string;
};

export type ConversationMention = {
  id: string;
  label: string;
  vehicleCheckItemId: string;
  vehicleCheckItem: {
    id: string;
    repairType: { name: string };
    vehiclePart: { name: string };
  };
};

export type ConversationMessage = {
  attachments: ConversationAttachment[];
  author: ConversationUser;
  authorId: string;
  body?: string | null;
  createdAt: string;
  id: string;
  mentions: ConversationMention[];
};

export type VehicleCheckConversation = {
  closedAt?: string | null;
  createdAt: string;
  id: string;
  messages: ConversationMessage[];
  participants: Array<{
    emailNotificationsEnabled: boolean;
    id: string;
    joinedAt: string;
    lastReadAt?: string | null;
    role: ConversationParticipantRole;
    user: ConversationUser;
    userId: string;
  }>;
  resolvedAt?: string | null;
  status: ConversationStatus;
  updatedAt: string;
  vehicleCheckId: string;
};

export type VehicleCheckConversationContext = {
  availableManagers: ConversationUser[];
  canManageParticipants: boolean;
  canPost: boolean;
  conversation: VehicleCheckConversation | null;
  restricted: boolean;
  unreadCount: number;
};

export type AppNotificationType =
  | "CONVERSATION_MESSAGE"
  | "CONVERSATION_PARTICIPANT_ADDED"
  | "CONVERSATION_STATUS_CHANGED"
  | "TAKEN_IN_CHARGE"
  | "VEHICLE_RECOVERED";

export type AppNotification = {
  actor?: Pick<ConversationUser, "firstName" | "id" | "lastName"> | null;
  createdAt: string;
  excerpt?: string | null;
  id: string;
  readAt?: string | null;
  route: string;
  title: string;
  type: AppNotificationType;
  vehicleCheckId?: string | null;
};

export type NotificationsResponse = {
  items: AppNotification[];
  unreadCount: number;
};

export type ConversationUploadSignature = {
  allowedFormats: string[];
  apiKey: string;
  cloudName: string;
  folder: string;
  maxFileSize: number;
  publicId: string;
  signature: string;
  timestamp: number;
  uploadUrl: string;
};

export type PublicDecisionAccessStatus = {
  actorId: string | null;
  authenticated: boolean;
  hasPersonalCode: boolean;
  maskedEmail: string;
  mode: "APPLICATION" | "PERSONAL_CODE" | null;
};
