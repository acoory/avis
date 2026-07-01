/**
 * Test exploratoire API GT Motive Estimate.
 *
 * Objectif :
 *  - reproduire le parcours "Créer/charger une estimation -> véhicule -> opérations"
 *  - sélectionner une pièce
 *  - ajouter ou retrouver une opération "Remplacer"
 *  - récupérer la référence, le prix de pièce et le temps de main-d'oeuvre
 *
 * Lancer :
 *   node gtmotive-api.test.ts
 */
import dotenv from "dotenv";
dotenv.config({ quiet: true });

const BASE_URL = "https://estimate.mygtmotive.com";

const CREDENTIALS = {
  client: requiredEnv("CLIENT_ID"),
  username: requiredEnv("USERNAME"),
  password: requiredEnv("PASSWORD"),
};

const CONFIG = {
  billingCodeId: numberEnv("GTMOTIVE_BILLING_CODE_ID", 195442),
  estimateProfileId: numberEnv("GTMOTIVE_ESTIMATE_PROFILE_ID", 0),
  registrationNumber: env("GTMOTIVE_TEST_IMMAT", "HB-162-JH"),
  vin: env("GTMOTIVE_TEST_VIN", "JTHAAAAE401023758"),
  targetPartDescription: env("GTMOTIVE_TEST_PART_DESCRIPTION", "Capot av"),
  targetFunctionalGroupId: env("GTMOTIVE_FUNCTIONAL_GROUP_ID", "11000"),
  existingEstimateId: optionalNumberEnv("GTMOTIVE_ESTIMATE_ID"),
  existingSecurityProfileId: optionalNumberEnv("GTMOTIVE_SECURITY_PROFILE_ID"),
  existingEstimateCode: env("GTMOTIVE_ESTIMATE_CODE", "2026062803140"),
  replaceActionId: numberEnv("GTMOTIVE_REPLACE_ACTION_ID", 1),
  relatedPartType: numberEnv("GTMOTIVE_RELATED_PART_TYPE", 0),
};

type JsonObject = Record<string, unknown>;

type EstimateListItem = {
  estimateId: number;
  estimateCode: string;
  securityProfileId: number;
  makeName?: string;
  modelName?: string;
  plateNumber?: string;
};

type EstimateContext = {
  id: number;
  code?: string;
  securityProfileId?: number;
  source: "created" | "existing" | "fallback";
};

type PartItem = {
  partCode: string;
  partDescription: string;
  partNumber: string;
  taskList?: Array<{ taskType: number; taskDescription: string; available: boolean }>;
};

type OperationItem = {
  operationId: number;
  actionId: number;
  actionDescription: string;
  partDescription: string;
  cupi: string;
  referenceCode?: { value?: string };
  priceMaterialAmount?: { value?: number };
  labourTime?: { value?: number };
  total?: { value?: number };
  oemReferenceCode?: string;
  oemReferencePresentPrice?: number;
  operationChildren?: OperationItem[];
};

let authToken: string | null = null;

function env(name: string, fallback: string): string {
  return process.env[name] || fallback;
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variable d'environnement manquante: ${name}`);
  return value;
}

function numberEnv(name: string, fallback: number): number {
  const value = process.env[name];
  return value ? Number(value) : fallback;
}

function optionalNumberEnv(name: string): number | undefined {
  const value = process.env[name];
  return value ? Number(value) : undefined;
}

function headers(extra: Record<string, string> = {}): Record<string, string> {
  return {
    Accept: "application/json",
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...extra,
  };
}

async function parseBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return "";
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function api<T = unknown>(
  label: string,
  pathOrUrl: string,
  init: RequestInit = {},
  options: { allowFailure?: boolean } = {},
): Promise<{ ok: boolean; status: number; data: T }> {
  const url = pathOrUrl.startsWith("http") ? pathOrUrl : `${BASE_URL}${pathOrUrl}`;
  const res = await fetch(url, {
    ...init,
    headers: headers((init.headers as Record<string, string>) || {}),
  });
  const data = (await parseBody(res)) as T;

  if (!res.ok && !options.allowFailure) {
    throw new Error(`${label} a échoué (${res.status}) : ${preview(data)}`);
  }

  log(label, res.ok, { status: res.status, response: data });
  return { ok: res.ok, status: res.status, data };
}

function preview(value: unknown): string {
  return JSON.stringify(redact(value), null, 2).slice(0, 1200);
}

function log(label: string, ok: boolean, data?: unknown) {
  console.log(`\n${ok ? "PASS" : "FAIL"} - ${label}`);
  if (data !== undefined) console.log(preview(data));
}

function generateEstimateCode(): string {
  const now = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  return date + String(Date.now()).slice(-5);
}

async function login() {
  const res = await api<JsonObject>("POST /api/auth/token", "/api/auth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(CREDENTIALS).toString(),
  });

  authToken = (res.data.access_token || res.data.token || res.data.Token || res.data.accessToken) as string | null;
  if (!authToken) throw new Error("Token non extrait de la réponse de login.");
}

async function getMe() {
  await api("GET /api/api/users/me", "/api/api/users/me");
}

async function getNextEstimatePayload(): Promise<JsonObject | null> {
  const res = await api<JsonObject>(
    "GET /api/api/estimate/newestimate",
    `/api/api/estimate/newestimate?billingCodeId=${CONFIG.billingCodeId}`,
    {},
    { allowFailure: true },
  );
  return res.ok && typeof res.data === "object" ? res.data : null;
}

async function createEstimate(): Promise<EstimateContext | null> {
  const suggested = await getNextEstimatePayload();
  const code = String(suggested?.code || suggested?.estimateCode || suggested?.Code || generateEstimateCode());

  const payload = {
    code,
    reference: null,
    billingCodeId: CONFIG.billingCodeId,
    estimateProfileId: CONFIG.estimateProfileId,
  };

  const res = await api<JsonObject>(
    "POST /api/api/estimate/create",
    "/api/api/estimate/create",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { allowFailure: true },
  );

  const estimate = res.data?.estimate as JsonObject | undefined;
  const id = Number(estimate?.id || res.data?.id || res.data?.estimateId);
  if (res.ok && Number.isFinite(id)) {
    return { id, code, securityProfileId: Number(estimate?.securityProfileId || 0) || undefined, source: "created" };
  }

  console.warn("Creation impossible. On tente de retrouver une estimation existante par code.");
  return null;
}

async function findEstimateByCode(code: string): Promise<EstimateContext | null> {
  const params = new URLSearchParams({
    skip: "0",
    top: "10",
    estimateCode: "",
    billingCodeId: "",
    makeCode: "",
    modelCode: "",
    registrationNumber: "",
    estimateState: "",
    estimateSituation: "",
    creationDateFrom: "",
    modificationDateFrom: "",
    showLocked: "false",
    includeGroups: "false",
    sortField: "",
    sortCriteria: "",
    quickSearch: code,
    onlyActiveModels: "true",
  });

  const res = await api<{ items?: EstimateListItem[] }>("GET /api/api/pagedestimates", `/api/api/pagedestimates?${params}`);
  const match = res.data.items?.find((item) => item.estimateCode === code) || res.data.items?.[0];
  if (!match) return null;

  return {
    id: match.estimateId,
    code: match.estimateCode,
    securityProfileId: match.securityProfileId,
    source: "fallback",
  };
}

async function resolveEstimate(): Promise<EstimateContext> {
  if (CONFIG.existingEstimateId) {
    return {
      id: CONFIG.existingEstimateId,
      securityProfileId: CONFIG.existingSecurityProfileId,
      source: "existing",
    };
  }

  const created = await createEstimate();
  if (created) return created;

  const fallback = await findEstimateByCode(CONFIG.existingEstimateCode);
  if (fallback) return fallback;

  throw new Error("Impossible de creer ou retrouver une estimation de test.");
}

async function loadEstimate(context: EstimateContext): Promise<JsonObject> {
  const params = new URLSearchParams({
    estimateId: String(context.id),
    securityProfileId: String(context.securityProfileId || 0),
  });
  const res = await api<JsonObject>("GET /api/api/estimate/estimate", `/api/api/estimate/estimate?${params}`);
  context.code = String(res.data.code || context.code || "");
  context.securityProfileId = Number(res.data.securityProfileId || context.securityProfileId || 0);
  return res.data;
}

async function searchVehicleByPlate() {
  const params = new URLSearchParams({
    billingCode: String(CONFIG.billingCodeId),
    odometer: "0",
  });
  const res = await api(
    "GET /api/api/vehicleregistrationnumber/{immat}",
    `/api/api/vehicleregistrationnumber/${encodeURIComponent(CONFIG.registrationNumber)}?${params}`,
    {},
    { allowFailure: true },
  );

  if (!res.ok) {
    console.warn("Recherche plaque ignoree: l'API peut echouer ponctuellement, le VIN et l'estimation chargee restent la source principale.");
  }
}

async function inspectVinData(context: EstimateContext) {
  await api("GET /api/api/vins/{vin}/make", `/api/api/vins/${CONFIG.vin}/make`, {}, { allowFailure: true });
  await api("GET /api/api/estimate/makelist", "/api/api/estimate/makelist", {}, { allowFailure: true });

  const vinQuery = await api(
    "POST /api/api/estimates/{id}/vinquery/",
    `/api/api/estimates/${context.id}/vinquery/`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vin: CONFIG.vin,
        registrationNumber: CONFIG.registrationNumber,
        isCalledFromButton: false,
      }),
    },
    { allowFailure: true },
  );

  if (!vinQuery.ok) {
    console.warn("VIN Query ignoree: l'estimation existante peut deja avoir ete identifiee, ou la marque/modele doit etre patch avant VIN Query.");
  }
}

async function selectFunctionalGroupIfConfigured(context: EstimateContext) {
  if (!CONFIG.targetFunctionalGroupId) return;

  await api(
    "PATCH /api/api/estimates/{id} behaviour.selectedFunctionalGroup",
    `/api/api/estimates/${context.id}?securityProfileId=${context.securityProfileId || 0}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        behaviour: {
          selectedFunctionalGroup: CONFIG.targetFunctionalGroupId,
        },
      }),
    },
    { allowFailure: true },
  );
}

async function getParts(context: EstimateContext): Promise<PartItem[]> {
  const res = await api<PartItem[]>(
    "GET /api/api/estimates/{id}/selectedfunctionalgroup/parts",
    `/api/api/estimates/${context.id}/selectedfunctionalgroup/parts`,
  );
  return res.data;
}

function findTargetPart(parts: PartItem[]): PartItem {
  const normalizedTarget = normalize(CONFIG.targetPartDescription);
  const canReplace = (item: PartItem) => item.taskList?.some((task) => task.taskType === CONFIG.replaceActionId && task.available);
  const exactPart = parts.find((item) => normalize(item.partDescription) === normalizedTarget && canReplace(item));
  const fuzzyPart = parts.find((item) => {
    const hasName = normalize(item.partDescription).includes(normalizedTarget);
    const hasReplace = canReplace(item);
    return hasName && hasReplace;
  });
  const part = exactPart || fuzzyPart;

  if (!part) {
    throw new Error(`Piece cible introuvable ou non remplacable: ${CONFIG.targetPartDescription}`);
  }

  return part;
}

async function getOperations(): Promise<OperationItem[]> {
  const res = await api<OperationItem[]>("GET /api/api/operation/operationList", "/api/api/operation/operationList");
  return res.data;
}

function findReplaceOperation(operations: OperationItem[], part: PartItem): OperationItem | undefined {
  return operations.find((operation) => {
    return (
      operation.actionId === CONFIG.replaceActionId &&
      operation.cupi === part.partCode &&
      normalize(operation.partDescription) === normalize(part.partDescription)
    );
  });
}

async function addReplaceOperation(context: EstimateContext, part: PartItem): Promise<unknown> {
  const payload = {
    cupi: part.partCode,
    relatedPartType: CONFIG.relatedPartType,
    taskType: CONFIG.replaceActionId,
  };

  const res = await api(
    "POST /api/api/estimates/{id}/operations",
    `/api/api/estimates/${context.id}/operations`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { allowFailure: true },
  );

  if (!res.ok) {
    throw new Error(`Ajout Remplacer impossible pour ${part.partDescription}: ${preview(res.data)}`);
  }

  return res.data;
}

async function ensureReplaceOperation(context: EstimateContext, part: PartItem): Promise<OperationItem> {
  let operations = await getOperations();
  let operation = findReplaceOperation(operations, part);

  if (!operation) {
    await addReplaceOperation(context, part);
    operations = await getOperations();
    operation = findReplaceOperation(operations, part);
  }

  if (!operation) {
    throw new Error("Operation Remplacer non retrouvee apres ajout.");
  }

  return operation;
}

async function getRelatedParts(context: EstimateContext, part: PartItem) {
  await api(
    "GET /api/api/estimates/{id}/parts/{partCode}/relatedParts",
    `/api/api/estimates/${context.id}/parts/${part.partCode}/relatedParts`,
    {},
    { allowFailure: true },
  );
}

function summarizeOperation(operation: OperationItem) {
  return {
    operationId: operation.operationId,
    action: operation.actionDescription,
    part: operation.partDescription,
    cupi: operation.cupi,
    reference: operation.referenceCode?.value || operation.oemReferenceCode,
    priceMaterialAmount: operation.priceMaterialAmount?.value ?? operation.oemReferencePresentPrice,
    labourTime: operation.labourTime?.value,
    total: operation.total?.value,
    children: operation.operationChildren?.map((child) => ({
      operationId: child.operationId,
      action: child.actionDescription,
      labourTime: child.labourTime?.value,
      total: child.total?.value,
    })),
  };
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (!value || typeof value !== "object") return value;

  const source = value as JsonObject;
  const output: JsonObject = {};
  for (const [key, item] of Object.entries(source)) {
    const lower = key.toLowerCase();
    output[key] = lower.includes("token") || lower.includes("password") || lower.includes("secret") ? "[redacted]" : redact(item);
  }
  return output;
}

async function runAll() {
  console.log("Demarrage du test GT Motive API");
  console.log(`Base URL: ${BASE_URL}`);

  await login();
  await getMe();
  await searchVehicleByPlate();

  const context = await resolveEstimate();
  console.log(`\nEstimation utilisee: ${context.id} (${context.source})`);

  await loadEstimate(context);
  await inspectVinData(context);
  await selectFunctionalGroupIfConfigured(context);

  const parts = await getParts(context);
  console.log(`\nPieces chargees: ${parts.length}`);

  const part = findTargetPart(parts);
  console.log(`Piece cible: ${part.partDescription} / cupi=${part.partCode} / partNumber=${part.partNumber}`);

  const operation = await ensureReplaceOperation(context, part);
  await getRelatedParts(context, part);

  console.log("\nRESULTAT REMPLACER");
  console.log(JSON.stringify(summarizeOperation(operation), null, 2));

  const piecePrice = operation.priceMaterialAmount?.value ?? operation.oemReferencePresentPrice;
  if (!piecePrice || piecePrice <= 0) {
    throw new Error("Prix de piece absent ou nul sur l'operation Remplacer.");
  }

  console.log("\nPASS - Parcours API Remplacer valide.");
}

runAll().catch((error) => {
  console.error("\nFAIL - Parcours API Remplacer en erreur");
  console.error(error);
  process.exitCode = 1;
});
