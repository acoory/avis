import { api } from "@/lib/api";
import {
  SalvageEvaluationPayload,
  SalvageEvaluationSendResult,
} from "@/types/salvage-evaluation";

export const salvageEvaluationService = {
  async preview(payload: SalvageEvaluationPayload) {
    const { data } = await api.post<Blob>(
      "/salvage-evaluations/preview.xlsx",
      payload,
      { responseType: "blob" },
    );
    return data;
  },

  async send(payload: SalvageEvaluationPayload) {
    const { data } = await api.post<SalvageEvaluationSendResult>(
      "/salvage-evaluations/send",
      payload,
    );
    return data;
  },
};
