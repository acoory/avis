export type SalvagePurchaseChannel = "BB" | "Risk";

export type SalvageEvaluationPayload = {
  estimatedRepairDays: number;
  kilometers: number;
  licenseNumber: string;
  make: string;
  model: string;
  mva: string;
  purchaseChannel: SalvagePurchaseChannel;
  purchaseType: string;
  recipientEmail: string;
  registrationDate: string;
  returnDate: string;
};

export type SalvageEvaluationSendResult = {
  filename: string;
  recipientEmail: string;
  sentAt: string;
  success: boolean;
};
