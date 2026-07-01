import {
  BadGatewayException,
  ConflictException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AddGtmotiveOperationDto } from './dto/add-gtmotive-operation.dto';
import { CreateGtmotiveEstimateDto } from './dto/create-gtmotive-estimate.dto';
import { IdentifyGtmotiveVehicleDto } from './dto/identify-gtmotive-vehicle.dto';
import { ReplaceGtmotivePartDto } from './dto/replace-gtmotive-part.dto';

type JsonObject = Record<string, unknown>;

type GtmotiveApiResult<T> = {
  ok: boolean;
  status: number;
  data: T;
};

type EstimateContext = {
  id: number;
  code?: string;
  securityProfileId?: number;
  source?: 'created' | 'fallback';
};

type EstimateListItem = {
  estimateId: number;
  estimateCode: string;
  securityProfileId: number;
};

type GtmotivePart = {
  partCode: string;
  partDescription: string;
  partNumber?: string;
  taskList?: Array<{
    taskType: number;
    taskDescription: string;
    available: boolean;
  }>;
};

type GtmotiveOperation = {
  operationId: number;
  actionId: number;
  actionDescription: string;
  actionType?: number;
  currency?: string;
  job?: string;
  technicity?: string;
  precalculusInformation?: string;
  partDescription: string;
  cupi: string;
  referenceCode?: { value?: string };
  units?: { value?: number };
  priceMaterialAmount?: { value?: number };
  labourTime?: { value?: number };
  pricePerHour?: string;
  userLabourAmount?: { value?: number };
  total?: { value?: number };
  oemReferenceCode?: string;
  oemReferencePresentPrice?: number;
  oemReferenceDescription?: string;
  paintInfo?: { totalMaterial?: number };
  operationChildren?: GtmotiveOperation[];
};

type NavigationBoard = {
  id?: number;
  description?: string;
  svg?: string;
  images?: Array<{ width?: number; url?: string }>;
  functionalGroups?: JsonObject[];
};

type VehicleRepresentationItem = {
  id?: number;
  url?: string;
  svgImage?: string;
  positionX?: number;
  positionY?: number;
  scale?: number;
  rotation?: number;
  gradient?: unknown;
  order?: number;
  state?: unknown;
  parts?: JsonObject[];
};

const DEFAULT_BASE_URL = 'https://estimate.mygtmotive.com';
const DEFAULT_GTAPI_BASE_URL = 'https://gtapi.mygtmotive.com';
const DEFAULT_GTAPI_KEY = 'D083708D-9CCB-4515-96A2-A2DE7D3763CC';
const DEFAULT_BILLING_CODE_ID = 195442;
const DEFAULT_ESTIMATE_PROFILE_ID = 0;
const DEFAULT_FUNCTIONAL_GROUP_ID = '11000';
const DEFAULT_FUNCTIONAL_GROUP_LABEL = 'CARROSSERIE EXTERIEURE';
const DEFAULT_EXISTING_ESTIMATE_CODE = '2026062803140';
const DEFAULT_TEST_REGISTRATION_NUMBER = 'HB-162-JH';
const DEFAULT_TEST_VIN = 'JTHAAAAE401023758';
const REPLACE_TASK_TYPE = 1;
const REPAIR_TASK_TYPE = 2;
const REMOVE_INSTALL_TASK_TYPE = 3;
const PAINT_TASK_TYPE = 4;
const DEFAULT_RELATED_PART_TYPE = 0;
const INCOMPATIBLE_TASK_TYPES: Record<number, number[]> = {
  [REPLACE_TASK_TYPE]: [REMOVE_INSTALL_TASK_TYPE],
  [REMOVE_INSTALL_TASK_TYPE]: [REPLACE_TASK_TYPE],
};
const FUNCTIONAL_GROUP_LABELS: Record<string, string> = {
  '11000': 'CARROSSERIE EXTERIEURE',
  '25000': 'CARROSSERIE INTERIEURE',
  '31000': 'EQUIPEMENTS EXTERIEURS',
  '41000': 'EQUIPEMENTS INTERIEURS',
  '51000': 'MECANIQUE',
  '61000': 'TRAIN ROULANT',
  '71000': 'ELECTRICITE',
  '81000': 'PEINTURE',
};

@Injectable()
export class GtmotiveService {
  private readonly logger = new Logger(GtmotiveService.name);
  private authToken: string | null = null;
  private tokenExpiresAt = 0;

  constructor(private readonly configService: ConfigService) {}

  async session() {
    await this.getAuthToken();
    const me = await this.gtmotiveApi<JsonObject>(
      'GET /api/api/users/me',
      '/api/api/users/me',
    );

    return {
      connected: true,
      billingCodeId:
        findFirstNumber(me.data, ['billingCodeId', 'defaultBillingCodeId']) ??
        this.getBillingCodeId(),
      user: {
        name: findFirstString(me.data, ['name', 'fullName', 'displayName']),
        username: findFirstString(me.data, ['username', 'userName', 'email']),
      },
    };
  }

  async createEstimate(dto: CreateGtmotiveEstimateDto) {
    const billingCodeId = dto.billingCodeId ?? this.getBillingCodeId();
    const estimateProfileId =
      dto.estimateProfileId ?? this.getEstimateProfileId();
    const codesToTry = await this.getEstimateCodesToTry(billingCodeId);

    let lastCreateResult: GtmotiveApiResult<JsonObject> | null = null;

    for (const code of codesToTry) {
      const payload = {
        code,
        reference: null,
        billingCodeId,
        estimateProfileId,
      };

      const created = await this.gtmotiveApi<JsonObject>(
        'POST /api/api/estimate/create',
        '/api/api/estimate/create',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
        { allowFailure: true },
      );
      lastCreateResult = created;

      const businessSuccess = created.data.success !== false;
      const estimate =
        typeof created.data.estimate === 'object' && created.data.estimate
          ? (created.data.estimate as JsonObject)
          : undefined;
      const id = Number(
        estimate?.id ?? created.data.id ?? created.data.estimateId,
      );

      this.logger.log(
        `createEstimate code=${code} httpOk=${created.ok} businessSuccess=${businessSuccess} estimateId=${Number.isFinite(id) ? id : ''} message=${String(extractResultMessage(created.data) ?? '')}`,
      );

      if (created.ok && businessSuccess && Number.isFinite(id)) {
        const context: EstimateContext = {
          id,
          code,
          securityProfileId:
            Number(estimate?.securityProfileId ?? 0) || undefined,
          source: 'created',
        };
        return this.toEstimateResponse(context);
      }

      if (!isDuplicateEstimateCode(created.data)) {
        break;
      }
    }

    const fallbackCode =
      this.configService.get<string>('GTMOTIVE_ESTIMATE_CODE') ??
      DEFAULT_EXISTING_ESTIMATE_CODE;
    this.logger.warn(
      `createEstimate failed, trying fallback estimateCode=${fallbackCode}`,
    );
    const fallback = await this.findEstimateByCode(fallbackCode);
    if (fallback) return this.toEstimateResponse(fallback);

    throw new BadGatewayException({
      message:
        extractResultMessage(lastCreateResult?.data) ??
        "GT Motive n'a pas cree l'estimation.",
      status: lastCreateResult?.status,
      details: sanitizeGtmotiveError(lastCreateResult?.data),
    });
  }

  async identifyVehicle(dto: IdentifyGtmotiveVehicleDto) {
    const warnings: string[] = [];
    const registrationNumber = dto.registrationNumber?.trim();
    let vin = dto.vin?.trim();
    let plateSearchData: unknown;

    if (registrationNumber) {
      const plateSearch = await this.searchVehicleByPlate(
        registrationNumber,
        dto.billingCodeId ?? this.getBillingCodeId(),
      );
      plateSearchData = plateSearch.data;
      this.logger.log(
        `plateSearch registrationNumber=${registrationNumber} status=${plateSearch.status} ok=${plateSearch.ok} response=${previewForLog(plateSearch.data)}`,
      );

      if (!plateSearch.ok) {
        warnings.push(
          "La recherche par immatriculation GT Motive a echoue. Le flux continue avec le VIN ou l'estimation.",
        );
      } else {
        vin = vin || extractVin(plateSearch.data);
      }
    }

    if (!vin) {
      vin = this.resolveFallbackVin(registrationNumber);
      if (vin) {
        warnings.push(
          "VIN de reference utilise car la recherche immatriculation GT Motive n'a pas retourne de VIN.",
        );
        this.logger.warn(
          `identifyVehicle using fallback VIN for registrationNumber=${String(registrationNumber ?? '')}`,
        );
      }
    }

    let vinQuerySucceeded = false;
    if (vin) {
      const vinQuery = await this.runVinQueryWithRetry(
        dto.estimateId,
        dto.securityProfileId,
        vin,
        registrationNumber,
      );
      vinQuerySucceeded = vinQuery.ok;

      if (!vinQuery.ok) {
        warnings.push(
          "VIN Query ignoree: l'estimation peut deja etre identifiee ou necessiter une selection marque/modele.",
        );
      }
    } else {
      warnings.push(
        "Aucun VIN recupere avant VIN Query. L'estimation rechargee reste la source principale.",
      );
    }

    const estimate = await this.loadEstimate({
      id: dto.estimateId,
      securityProfileId: dto.securityProfileId,
    });
    const vehicle = this.extractVehicle(
      estimate,
      plateSearchData,
      registrationNumber,
      vin,
    );

    this.logger.log(
      `identifyVehicle estimateId=${dto.estimateId} securityProfileId=${String(estimate.securityProfileId ?? dto.securityProfileId ?? '')} make=${String(vehicle.make ?? '')} model=${String(vehicle.model ?? '')} vin=${vehicle.vin ? 'present' : 'missing'} makeCode=${String(vehicle.makeCode ?? '')} modelId=${String(vehicle.modelId ?? '')} equipment=${String(vehicle.equipment ?? '')} warnings=${warnings.length}`,
    );

    return {
      estimateId: dto.estimateId,
      securityProfileId: Number(estimate.securityProfileId ?? 0) || undefined,
      vehicle,
      ready:
        vinQuerySucceeded ||
        this.isVehicleResolvedEnough(vehicle) ||
        Boolean(vin && registrationNumber),
      warnings,
    };
  }

  async getNavigationBoard(query: {
    estimateId?: number;
    securityProfileId?: number;
    makeCode?: string;
    modelId?: string;
    navigationModelCode?: string;
    equipment?: string;
  }) {
    const estimateData = query.estimateId
      ? await this.loadEstimate({
          id: query.estimateId,
          securityProfileId: query.securityProfileId,
        })
      : null;
    const estimateVehicle = estimateData
      ? this.extractVehicle(estimateData, undefined)
      : null;
    const makeCode =
      query.makeCode ??
      estimateVehicle?.makeCode ??
      this.configService.get<string>('GTMOTIVE_NAVIGATION_MAKE_CODE');
    const modelId =
      query.modelId ??
      estimateVehicle?.modelId ??
      this.configService.get<string>('GTMOTIVE_NAVIGATION_MODEL_ID');
    const navigationModelCode =
      query.navigationModelCode ??
      estimateVehicle?.navigationModelCode ??
      (makeCode && modelId
        ? await this.resolveNavigationModelCode(makeCode, modelId)
        : undefined) ??
      this.configService.get<string>('GTMOTIVE_NAVIGATION_MODEL_CODE');
    const equipment =
      query.equipment ??
      estimateVehicle?.equipment ??
      this.configService.get<string>('GTMOTIVE_NAVIGATION_EQUIPMENT');

    this.logger.log(
      `navigationBoard request navigationModelCode=${String(navigationModelCode ?? '')} makeCode=${String(makeCode ?? '')} modelId=${String(modelId ?? '')} equipment=${String(equipment ?? '')}`,
    );

    if (!navigationModelCode || !modelId) {
      this.logger.warn(
        `navigationBoard fallback: missing navigationModelCode/modelId navigationModelCode=${String(navigationModelCode ?? '')} modelId=${String(modelId ?? '')}`,
      );
      return this.fallbackNavigationBoard(
        "Code modele de navigation/modelId absents dans l'estimation GT Motive.",
      );
    }

    const params = new URLSearchParams({
      language: 'fr-FR',
      equipment: equipment ?? '',
      modelId,
      ApiKey: this.getGtapiKey(),
    });
    const res = await this.gtapi<NavigationBoard | NavigationBoard[]>(
      'GET /api/models/{navigationModelCode}/navigationboards',
      `/api/models/${encodeURIComponent(navigationModelCode)}/navigationboards?${params}`,
      {},
      { allowFailure: true },
    );

    if (!res.ok) {
      this.logger.warn(
        `navigationBoard fallback: gtapi status=${res.status} navigationModelCode=${navigationModelCode} makeCode=${String(makeCode ?? '')} modelId=${modelId} equipment=${String(equipment ?? '')} response=${previewForLog(res.data)}`,
      );
      return this.fallbackNavigationBoard(
        'Navigation board GT Motive indisponible pour ce vehicule.',
      );
    }

    const board = Array.isArray(res.data) ? res.data[0] : res.data;
    this.logger.log(
      `navigationBoard response boardId=${String(board?.id ?? '')} svg=${Boolean(board?.svg)} images=${board?.images?.length ?? 0} groups=${board?.functionalGroups?.length ?? 0}`,
    );
    return this.toNavigationBoardResponse(board);
  }

  async proxyNavigationBoardSvg(boardId: string, version?: string) {
    const params = version ? `?version=${encodeURIComponent(version)}` : '';
    this.logger.log(
      `proxyNavigationBoardSvg boardId=${boardId} version=${String(version ?? '')}`,
    );
    return this.proxyGtapiAsset(
      `/api/navigationboards/${encodeURIComponent(boardId)}${params}`,
      'image/svg+xml; charset=utf-8',
    );
  }

  async proxyNavigationBoardImage(imageId: string) {
    this.logger.log(`proxyNavigationBoardImage imageId=${imageId}`);
    return this.proxyGtapiAsset(
      `/api/navigationboards-images/${encodeURIComponent(imageId)}`,
      'image/png',
    );
  }

  async selectGroup(
    estimateId: number,
    groupId: string,
    securityProfileId?: number,
  ) {
    const selection = await this.selectFunctionalGroup({
      id: estimateId,
      securityProfileId,
      functionalGroupId: groupId,
    });
    this.logger.log(
      `selectGroup estimateId=${estimateId} securityProfileId=${String(securityProfileId ?? '')} groupId=${groupId} patchStatus=${selection.status} patchOk=${selection.ok}`,
    );

    return {
      estimateId,
      patchStatus: selection.status,
      patchOk: selection.ok,
      selectedGroup: {
        id: groupId,
        label:
          groupId === this.getFunctionalGroupId()
            ? (this.configService.get<string>('GTMOTIVE_FUNCTIONAL_GROUP_LABEL') ??
              DEFAULT_FUNCTIONAL_GROUP_LABEL)
            : groupId,
      },
    };
  }

  async getParts(
    estimateId: number,
    securityProfileId?: number,
    groupId = this.getFunctionalGroupId(),
  ) {
    this.logger.log(
      `getParts start estimateId=${estimateId} securityProfileId=${String(securityProfileId ?? '')} groupId=${groupId}`,
    );
    const estimateBeforeSelection = await this.loadEstimate({
      id: estimateId,
      securityProfileId,
    });
    const vehicleBeforeSelection = this.extractVehicle(
      estimateBeforeSelection,
      undefined,
    );

    const selection = await this.selectFunctionalGroup({
      id: estimateId,
      securityProfileId,
      functionalGroupId: groupId,
    });
    this.logger.log(
      `getParts selectedFunctionalGroup estimateId=${estimateId} groupId=${groupId} patchStatus=${selection.status} patchOk=${selection.ok} patchResponse=${previewForLog(selection.data)}`,
    );

    this.logger.log(
      `getParts estimateState estimateId=${estimateId} vehicle=${previewForLog(vehicleBeforeSelection)}`,
    );

    let parts = await this.fetchSelectedFunctionalGroupParts(estimateId);

    if (!parts.ok) {
      this.logger.warn(
        `getParts first attempt failed estimateId=${estimateId} groupId=${groupId} partsStatus=${parts.status}. Retrying after estimate reload and group reselection.`,
      );
      await this.loadEstimate({ id: estimateId, securityProfileId });
      const retrySelection = await this.selectFunctionalGroup({
        id: estimateId,
        securityProfileId,
        functionalGroupId: groupId,
      });
      this.logger.log(
        `getParts retry selectedFunctionalGroup estimateId=${estimateId} groupId=${groupId} patchStatus=${retrySelection.status} patchOk=${retrySelection.ok}`,
      );
      parts = await this.fetchSelectedFunctionalGroupParts(estimateId);
    }

    if (!parts.ok) {
      this.logger.warn(
        `getParts failed estimateId=${estimateId} securityProfileId=${String(securityProfileId ?? '')} groupId=${groupId} partsStatus=${parts.status} patchStatus=${selection.status} response=${previewForLog(parts.data)}`,
      );
      throw new BadGatewayException({
        message:
          'GT Motive ne peut pas resoudre la liste des pieces pour ce groupe.',
        status: parts.status,
        details: sanitizeGtmotiveError(parts.data),
        context: {
          estimateId,
          securityProfileId: securityProfileId ?? null,
          groupId,
          selectFunctionalGroupStatus: selection.status,
          selectFunctionalGroupOk: selection.ok,
          hint:
            "Verifier que VIN Query a bien resolu le vehicule dans l'estimation et que le securityProfileId est celui retourne par l'estimation chargee.",
        },
      });
    }

    this.logger.log(
      `getParts success estimateId=${estimateId} groupId=${groupId} count=${parts.data.length}`,
    );

    return {
      groups: [
        {
          id: groupId,
          label:
            groupId === this.getFunctionalGroupId()
              ? (this.configService.get<string>('GTMOTIVE_FUNCTIONAL_GROUP_LABEL') ??
                DEFAULT_FUNCTIONAL_GROUP_LABEL)
              : groupId,
          selected: true,
        },
      ],
      parts: parts.data.map((part) => this.toPartResponse(part)),
    };
  }

  async getGraphicZone(groupId: string, query: {
    estimateId?: number;
    securityProfileId?: number;
    makeCode?: string;
    modelId?: string;
    navigationModelCode?: string;
    equipment?: string;
  }) {
    const estimateData = query.estimateId
      ? await this.loadEstimate({
          id: query.estimateId,
          securityProfileId: query.securityProfileId,
        })
      : null;
    const estimateVehicle = estimateData
      ? this.extractVehicle(estimateData, undefined)
      : null;
    const makeCode =
      query.makeCode ??
      estimateVehicle?.makeCode ??
      this.configService.get<string>('GTMOTIVE_NAVIGATION_MAKE_CODE');
    const modelId =
      query.modelId ??
      estimateVehicle?.modelId ??
      this.configService.get<string>('GTMOTIVE_NAVIGATION_MODEL_ID');
    const navigationModelCode =
      query.navigationModelCode ??
      estimateVehicle?.navigationModelCode ??
      (makeCode && modelId
        ? await this.resolveNavigationModelCode(makeCode, modelId)
        : undefined) ??
      this.configService.get<string>('GTMOTIVE_NAVIGATION_MODEL_CODE');
    const equipmentCodes = estimateData
      ? extractSelectedEquipmentCodes(estimateData)
      : [];
    const configuredEquipment = this.configService.get<string>(
      'GTMOTIVE_NAVIGATION_EQUIPMENT',
    );
    const equipments = equipmentCodes.length
      ? equipmentCodes
      : [query.equipment ?? estimateVehicle?.equipment ?? configuredEquipment].filter(
          (value): value is string => Boolean(value),
        );
    const manufacturingValues = estimateData
      ? extractManufacturingValues(estimateData)
      : [];

    this.logger.log(
      `graphicZone request groupId=${groupId} navigationModelCode=${String(navigationModelCode ?? '')} makeCode=${String(makeCode ?? '')} modelId=${String(modelId ?? '')} equipments=${equipments.length} manufacturingValues=${manufacturingValues.length}`,
    );

    if (!navigationModelCode || !modelId) {
      this.logger.warn(
        `graphicZone unavailable: missing navigationModelCode/modelId groupId=${groupId}`,
      );
      return {
        groupId,
        parts: [],
        imgs: [],
        available: false,
        message:
          "Parametres vehiclerepresentation incomplets. La liste de pieces reste disponible.",
      };
    }

    const params = new URLSearchParams({
      ApiKey: this.getGtapiKey(),
      jobType: 'All',
      language: 'fr-FR',
      equipments: equipments.join(','),
      manufacturingValues: manufacturingValues.join(','),
      modelId,
    });

    const res = await this.gtapi<VehicleRepresentationItem[]>(
      'GET /api/models/{model}/zones/{groupId}/vehiclerepresentation',
      `/api/models/${encodeURIComponent(navigationModelCode)}/zones/${encodeURIComponent(groupId)}/vehiclerepresentation?${params}`,
      {},
      { allowFailure: true },
    );

    if (!res.ok) {
      this.logger.warn(
        `graphicZone unavailable: gtapi status=${res.status} groupId=${groupId} response=${previewForLog(res.data)}`,
      );
      return {
        groupId,
        parts: [],
        imgs: [],
        available: false,
        message:
          "Vue eclatee detaillee indisponible. La liste de pieces reste disponible.",
      };
    }

    const imgs = Array.isArray(res.data)
      ? res.data
          .map((item) => ({
            id: item.id ?? null,
            url: item.url ?? null,
            svgImage: item.svgImage,
            positionX: item.positionX ?? 0,
            positionY: item.positionY ?? 0,
            rotation: item.rotation ?? 0,
            scale: item.scale ?? 1,
            order: item.order ?? 0,
            gradient: item.gradient ?? null,
            state: item.state ?? null,
            situation: (item as JsonObject).situation ?? null,
            parts: item.parts ?? [],
          }))
          .sort((a, b) => a.order - b.order)
      : [];

    this.logger.log(
      `graphicZone success groupId=${groupId} imgs=${imgs.length} equipments=${equipments.join(',')} manufacturingValues=${manufacturingValues.join(',')}`,
    );

    return {
      groupId,
      available: true,
      imgs,
      parts: imgs.flatMap((item) => item.parts),
      metadata: {
        navigationModelCode,
        modelId,
        equipments,
        manufacturingValues,
      },
    };
  }

  async replacePart(estimateId: number, dto: ReplaceGtmotivePartDto) {
    return this.addPartOperation(estimateId, {
      ...dto,
      taskType: REPLACE_TASK_TYPE,
    });
  }

  async addPartOperation(estimateId: number, dto: AddGtmotiveOperationDto) {
    if (dto.securityProfileId !== undefined) {
      await this.loadEstimate({
        id: estimateId,
        securityProfileId: dto.securityProfileId,
      });
    }

    const part = {
      partCode: dto.partCode,
      partDescription: dto.partDescription ?? '',
    };
    const operation = await this.ensurePartOperation(estimateId, part, dto);

    return this.toOperationResponse(operation);
  }

  async switchPartOperation(estimateId: number, dto: AddGtmotiveOperationDto) {
    if (dto.securityProfileId !== undefined) {
      await this.loadEstimate({
        id: estimateId,
        securityProfileId: dto.securityProfileId,
      });
    }

    const part = {
      partCode: dto.partCode,
      partDescription: dto.partDescription ?? '',
    };
    const operations = await this.getOperationList();
    const existingOperation = this.findPartOperation(
      operations,
      part,
      dto.taskType,
    );

    if (existingOperation) {
      return {
        ...this.toOperationResponse(existingOperation),
        replacedOperation: null,
      };
    }

    const incompatibleOperation = this.findIncompatiblePartOperation(
      operations,
      part,
      dto.taskType,
    );

    if (incompatibleOperation) {
      await this.deleteGtmotiveOperation(estimateId, incompatibleOperation);
    }

    const operation = await this.ensurePartOperation(estimateId, part, dto);

    return {
      ...this.toOperationResponse(operation),
      replacedOperation: incompatibleOperation
        ? this.toOperationSummary(incompatibleOperation)
        : null,
    };
  }

  async getOperations(context?: EstimateContext) {
    if (context) await this.loadEstimate(context);
    const operations = await this.getOperationList();
    return operations.map((operation) => this.toOperationResponse(operation));
  }

  private fallbackNavigationBoard(message: string) {
    return {
      id: null,
      description: null,
      svgUrl: null,
      images: [],
      functionalGroups: [
        {
          id: this.getFunctionalGroupId(),
          description:
            this.configService.get<string>('GTMOTIVE_FUNCTIONAL_GROUP_LABEL') ??
            DEFAULT_FUNCTIONAL_GROUP_LABEL,
        },
      ],
      fallback: true,
      message,
    };
  }

  private async getAuthToken() {
    if (this.authToken && Date.now() < this.tokenExpiresAt) {
      return this.authToken;
    }

    const client = this.requiredConfig('CLIENT_ID');
    const username = this.requiredConfig('USERNAME');
    const password = this.requiredConfig('PASSWORD');

    const res = await fetch(`${this.getBaseUrl()}/api/auth/token`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ client, username, password }).toString(),
    });
    const data = (await parseResponseBody(res)) as JsonObject;

    if (!res.ok) {
      throw new BadGatewayException({
        message: "L'authentification GT Motive a echoue.",
        status: res.status,
        details: sanitizeGtmotiveError(data),
      });
    }

    const token = stringFromObject(data, [
      'access_token',
      'token',
      'Token',
      'accessToken',
    ]);
    if (!token) {
      throw new BadGatewayException(
        "Token GT Motive absent de la reponse d'authentification.",
      );
    }

    const expiresIn = findFirstNumber(data, ['expires_in', 'expiresIn']);
    this.authToken = token;
    this.tokenExpiresAt = Date.now() + ((expiresIn ?? 3600) - 60) * 1000;
    return token;
  }

  private async gtmotiveApi<T>(
    label: string,
    pathOrUrl: string,
    init: RequestInit = {},
    options: { allowFailure?: boolean } = {},
  ): Promise<GtmotiveApiResult<T>> {
    const token = await this.getAuthToken();
    const url = pathOrUrl.startsWith('http')
      ? pathOrUrl
      : `${this.getBaseUrl()}${pathOrUrl}`;
    const res = await fetch(url, {
      ...init,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        ...((init.headers as Record<string, string> | undefined) ?? {}),
      },
    });
    const data = (await parseResponseBody(res)) as T;

    if (!res.ok && !options.allowFailure) {
      throw new BadGatewayException({
        message: `${label} a echoue chez GT Motive.`,
        status: res.status,
        details: sanitizeGtmotiveError(data),
      });
    }

    return { ok: res.ok, status: res.status, data };
  }

  private async gtapi<T>(
    label: string,
    pathOrUrl: string,
    init: RequestInit = {},
    options: { allowFailure?: boolean } = {},
  ): Promise<GtmotiveApiResult<T>> {
    const url = pathOrUrl.startsWith('http')
      ? pathOrUrl
      : `${this.getGtapiBaseUrl()}${pathOrUrl}`;
    this.logger.log(`gtapi ${label} url=${redactUrl(url)}`);
    const res = await fetch(url, {
      ...init,
      headers: {
        Accept: 'application/json',
        Origin: this.getBaseUrl(),
        Referer: `${this.getBaseUrl()}/estimate/operations`,
        ...((init.headers as Record<string, string> | undefined) ?? {}),
      },
    });
    const data = (await parseResponseBody(res)) as T;
    this.logger.log(`gtapi ${label} status=${res.status} ok=${res.ok}`);

    if (!res.ok && !options.allowFailure) {
      throw new BadGatewayException({
        message: `${label} a echoue chez GT Motive.`,
        status: res.status,
        details: sanitizeGtmotiveError(data),
      });
    }

    return { ok: res.ok, status: res.status, data };
  }

  private async proxyGtapiAsset(pathOrUrl: string, fallbackContentType: string) {
    const rawUrl = pathOrUrl.startsWith('http')
      ? pathOrUrl
      : `${this.getGtapiBaseUrl()}${pathOrUrl}`;
    const url = appendQueryParam(rawUrl, 'ApiKey', this.getGtapiKey());
    this.logger.log(`proxyGtapiAsset url=${redactUrl(url)}`);
    const res = await fetch(url, {
      headers: {
        Accept: '*/*',
        Origin: this.getBaseUrl(),
        Referer: `${this.getBaseUrl()}/estimate/operations`,
      },
    });

    if (!res.ok) {
      this.logger.warn(
        `proxyGtapiAsset failed status=${res.status} contentType=${String(res.headers.get('content-type') ?? '')}`,
      );
      throw new BadGatewayException({
        message: "Asset GT Motive indisponible.",
        status: res.status,
      });
    }

    this.logger.log(
      `proxyGtapiAsset ok status=${res.status} contentType=${String(res.headers.get('content-type') ?? fallbackContentType)}`,
    );

    return {
      contentType: res.headers.get('content-type') ?? fallbackContentType,
      body: Buffer.from(await res.arrayBuffer()),
    };
  }

  private async getNextEstimatePayload(billingCodeId: number) {
    const res = await this.gtmotiveApi<unknown>(
      'GET /api/api/estimate/newestimate',
      `/api/api/estimate/newestimate?billingCodeId=${billingCodeId}`,
      {},
      { allowFailure: true },
    );

    return res.ok && typeof res.data === 'object' ? res.data : null;
  }

  private async getEstimateCodesToTry(billingCodeId: number) {
    const suggested = await this.getNextEstimatePayload(billingCodeId);
    const suggestedCode = stringFromObject(suggested, [
      'code',
      'estimateCode',
      'Code',
    ]);
    const generatedCodes = [
      this.generateEstimateCode(),
      this.generateEstimateCode(),
      this.generateEstimateCode(),
    ];
    const codes = suggestedCode ? [suggestedCode] : generatedCodes;

    this.logger.log(
      `createEstimate codeMode=suggested-first suggested=${String(suggestedCode ?? '')} generated=${generatedCodes.join(',')}`,
    );
    return codes;
  }

  private async findEstimateByCode(code: string): Promise<EstimateContext | null> {
    const params = new URLSearchParams({
      skip: '0',
      top: '10',
      estimateCode: '',
      billingCodeId: '',
      makeCode: '',
      modelCode: '',
      registrationNumber: '',
      estimateState: '',
      estimateSituation: '',
      creationDateFrom: '',
      modificationDateFrom: '',
      showLocked: 'false',
      includeGroups: 'false',
      sortField: '',
      sortCriteria: '',
      quickSearch: code,
      onlyActiveModels: 'true',
    });

    const res = await this.gtmotiveApi<{ items?: EstimateListItem[] }>(
      'GET /api/api/pagedestimates',
      `/api/api/pagedestimates?${params}`,
    );
    const match =
      res.data.items?.find((item) => item.estimateCode === code) ??
      res.data.items?.[0];
    if (!match) return null;

    return {
      id: match.estimateId,
      code: match.estimateCode,
      securityProfileId: match.securityProfileId,
      source: 'fallback',
    };
  }

  private async loadEstimate(context: EstimateContext): Promise<JsonObject> {
    const params = new URLSearchParams({
      estimateId: String(context.id),
      securityProfileId: String(context.securityProfileId ?? 0),
    });
    const res = await this.gtmotiveApi<JsonObject>(
      'GET /api/api/estimate/estimate',
      `/api/api/estimate/estimate?${params}`,
    );
    return res.data;
  }

  private async searchVehicleByPlate(
    registrationNumber: string,
    billingCodeId: number,
  ) {
    const params = new URLSearchParams({
      billingCode: String(billingCodeId),
      odometer: '0',
    });

    return this.gtmotiveApi(
      'GET /api/api/vehicleregistrationnumber/{immat}',
      `/api/api/vehicleregistrationnumber/${encodeURIComponent(registrationNumber)}?${params}`,
      {},
      { allowFailure: true },
    );
  }

  private async runVinQueryWithRetry(
    estimateId: number,
    securityProfileId: number | undefined,
    vin: string,
    registrationNumber?: string,
  ) {
    await this.loadEstimate({ id: estimateId, securityProfileId });
    const vinMake = await this.gtmotiveApi(
      'GET /api/api/vins/{vin}/make',
      `/api/api/vins/${encodeURIComponent(vin)}/make`,
      {},
      { allowFailure: true },
    );
    this.logger.log(
      `vinMake vin=${vin} status=${vinMake.status} ok=${vinMake.ok} response=${previewForLog(vinMake.data)}`,
    );

    const makeList = await this.gtmotiveApi(
      'GET /api/api/estimate/makelist',
      '/api/api/estimate/makelist',
      {},
      { allowFailure: true },
    );
    this.logger.log(
      `makeList before vinQuery status=${makeList.status} ok=${makeList.ok}`,
    );

    const attempts = [
      { registrationNumber: registrationNumber || null, isCalledFromButton: false },
      { registrationNumber: registrationNumber || null, isCalledFromButton: true },
      { registrationNumber: null, isCalledFromButton: false },
    ];

    let lastResult: GtmotiveApiResult<unknown> | null = null;
    for (let index = 0; index < attempts.length; index += 1) {
      if (index > 0) await delay(350);
      const payload = {
        vin,
        ...attempts[index],
      };
      const result = await this.gtmotiveApi(
        'POST /api/api/estimates/{id}/vinquery/',
        `/api/api/estimates/${estimateId}/vinquery/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
        { allowFailure: true },
      );
      lastResult = result;
      this.logger.log(
        `vinQuery attempt=${index + 1} estimateId=${estimateId} status=${result.status} ok=${result.ok} payload=${JSON.stringify(payload)} response=${previewForLog(result.data)}`,
      );

      if (result.ok || isVinQueryAlreadyMade(result.data)) {
        return {
          ...result,
          ok: true,
        };
      }
    }

    return lastResult as GtmotiveApiResult<unknown>;
  }

  private async selectFunctionalGroup(
    context: EstimateContext & { functionalGroupId?: string },
  ) {
    return this.gtmotiveApi(
      'PATCH /api/api/estimates/{id} behaviour.selectedFunctionalGroup',
      `/api/api/estimates/${context.id}?securityProfileId=${context.securityProfileId ?? 0}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          behaviour: {
            selectedFunctionalGroup:
              context.functionalGroupId ?? this.getFunctionalGroupId(),
          },
        }),
      },
      { allowFailure: true },
    );
  }

  private fetchSelectedFunctionalGroupParts(estimateId: number) {
    return this.gtmotiveApi<GtmotivePart[]>(
      'GET /api/api/estimates/{id}/selectedfunctionalgroup/parts',
      `/api/api/estimates/${estimateId}/selectedfunctionalgroup/parts`,
      {},
      { allowFailure: true },
    );
  }

  private async getOperationList() {
    const res = await this.gtmotiveApi<GtmotiveOperation[]>(
      'GET /api/api/operation/operationList',
      '/api/api/operation/operationList',
    );
    return res.data;
  }

  private async resolveNavigationModelCode(makeCode: string, modelId: string) {
    const res = await this.gtmotiveApi<JsonObject>(
      'GET /api/api/makes/{makeCode}/models/{modelId}',
      `/api/api/makes/${encodeURIComponent(makeCode)}/models/${encodeURIComponent(modelId)}`,
      {},
      { allowFailure: true },
    );

    if (!res.ok) {
      this.logger.warn(
        `resolveNavigationModelCode failed makeCode=${makeCode} modelId=${modelId} status=${res.status} response=${previewForLog(res.data)}`,
      );
      return undefined;
    }

    const navigationModelCode = findFirstString(res.data, [
      'cum',
      'navigationModelCode',
      'modelCum',
    ]);
    this.logger.log(
      `resolveNavigationModelCode makeCode=${makeCode} modelId=${modelId} navigationModelCode=${String(navigationModelCode ?? '')}`,
    );
    return navigationModelCode;
  }

  private async addGtmotiveOperation(
    estimateId: number,
    partCode: string,
    relatedPartType: number,
    taskType: number,
  ) {
    const payload = {
      cupi: partCode,
      relatedPartType,
      taskType,
    };

    const res = await this.gtmotiveApi(
      'POST /api/api/estimates/{id}/operations',
      `/api/api/estimates/${estimateId}/operations`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      { allowFailure: true },
    );

    const businessFailure = isOperationBusinessFailure(res.data);
    this.logger.log(
      `addOperation estimateId=${estimateId} partCode=${partCode} taskType=${taskType} status=${res.status} ok=${res.ok} businessFailure=${businessFailure} response=${previewForLog(res.data)}`,
    );

    if (!res.ok || businessFailure) {
      throw new BadGatewayException({
        message:
          extractResultMessage(res.data) ??
          `L'operation ${this.operationLabel(taskType)} n'a pas pu etre ajoutee.`,
        status: res.status,
        details: sanitizeGtmotiveError(res.data),
      });
    }
  }

  private async deleteGtmotiveOperation(
    estimateId: number,
    operation: GtmotiveOperation,
  ) {
    const actionType = operation.actionType ?? operation.actionId;
    const res = await this.gtmotiveApi<JsonObject>(
      'DELETE /api/api/estimates/{id}/operations/{cupi}/{actionType}',
      `/api/api/estimates/${estimateId}/operations/${encodeURIComponent(operation.cupi)}/${actionType}`,
      {
        method: 'DELETE',
      },
      { allowFailure: true },
    );

    const businessFailure = isOperationBusinessFailure(res.data);
    this.logger.log(
      `deleteOperation estimateId=${estimateId} cupi=${operation.cupi} operationId=${operation.operationId} actionType=${actionType} status=${res.status} ok=${res.ok} businessFailure=${businessFailure} response=${previewForLog(res.data)}`,
    );

    if (!res.ok || businessFailure) {
      throw new BadGatewayException({
        message:
          extractResultMessage(res.data) ??
          `L'operation ${operation.actionDescription} n'a pas pu etre supprimee.`,
        status: res.status,
        details: sanitizeGtmotiveError(res.data),
      });
    }
  }

  private async ensurePartOperation(
    estimateId: number,
    part: Pick<GtmotivePart, 'partCode' | 'partDescription'>,
    dto: Pick<AddGtmotiveOperationDto, 'relatedPartType' | 'taskType'>,
  ) {
    let operations = await this.getOperationList();
    let operation = this.findPartOperation(operations, part, dto.taskType);
    const incompatibleOperation = this.findIncompatiblePartOperation(
      operations,
      part,
      dto.taskType,
    );

    if (!operation && incompatibleOperation) {
      throw new ConflictException({
        message: `L'operation ${this.operationLabel(dto.taskType)} est incompatible avec l'operation ${incompatibleOperation.actionDescription} deja ajoutee sur cette piece.`,
        conflictingOperation: this.toOperationResponse(incompatibleOperation),
      });
    }

    if (!operation) {
      await this.addGtmotiveOperation(
        estimateId,
        part.partCode,
        dto.relatedPartType ?? DEFAULT_RELATED_PART_TYPE,
        dto.taskType,
      );
      operations = await this.getOperationList();
      operation = this.findPartOperation(operations, part, dto.taskType);
    }

    if (!operation) {
      throw new BadGatewayException(
        `L'operation ${this.operationLabel(dto.taskType)} n'a pas ete retrouvee apres ajout.`,
      );
    }

    return operation;
  }

  private toOperationSummary(operation: GtmotiveOperation) {
    return {
      operationId: operation.operationId,
      actionId: operation.actionId,
      operation: operation.actionDescription,
      part: {
        id: operation.cupi,
        label: operation.partDescription,
      },
    };
  }

  private findIncompatiblePartOperation(
    operations: GtmotiveOperation[],
    part: Pick<GtmotivePart, 'partCode' | 'partDescription'>,
    taskType: number,
  ) {
    return operations.find((operation) => {
      const operationTaskType = operation.actionId ?? operation.actionType;
      const incompatibleTaskTypes = INCOMPATIBLE_TASK_TYPES[taskType] ?? [];
      if (!incompatibleTaskTypes.includes(operationTaskType)) return false;

      const samePartCode = operation.cupi === part.partCode;
      const sameDescription =
        part.partDescription &&
        normalize(operation.partDescription) === normalize(part.partDescription);

      return samePartCode || sameDescription;
    });
  }

  private findPartOperation(
    operations: GtmotiveOperation[],
    part: Pick<GtmotivePart, 'partCode' | 'partDescription'>,
    taskType: number,
  ) {
    return operations.find((operation) => {
      const sameAction =
        operation.actionId === taskType || operation.actionType === taskType;
      const samePartCode = operation.cupi === part.partCode;
      const sameDescription =
        !part.partDescription ||
        normalize(operation.partDescription) === normalize(part.partDescription);

      return sameAction && samePartCode && sameDescription;
    });
  }

  private operationLabel(taskType: number) {
    if (taskType === REPLACE_TASK_TYPE) return 'Remplacer';
    if (taskType === REPAIR_TASK_TYPE) return 'Reparer';
    if (taskType === REMOVE_INSTALL_TASK_TYPE) return 'Deposer et poser';
    if (taskType === PAINT_TASK_TYPE) return 'Peindre';
    return `taskType ${taskType}`;
  }

  private toEstimateResponse(context: EstimateContext) {
    return {
      estimateId: context.id,
      code: context.code,
      securityProfileId: context.securityProfileId,
      source: context.source,
    };
  }

  private toPartResponse(part: GtmotivePart) {
    const replaceTask = part.taskList?.find(
      (task) => task.taskType === REPLACE_TASK_TYPE && task.available,
    );

    return {
      id: part.partCode,
      label: part.partDescription,
      partNumber: part.partNumber,
      canReplace: Boolean(replaceTask),
      operations:
        part.taskList?.map((task) => ({
          id: task.taskType,
          label: task.taskDescription,
          available: task.available,
        })) ?? [],
    };
  }

  private toOperationResponse(operation: GtmotiveOperation) {
    const partPrice = amountValue(operation.priceMaterialAmount);
    const total = amountValue(operation.total);
    const labourTime = amountValue(operation.labourTime);
    const labourRate = parseHourlyRate(operation.pricePerHour);
    const labourAmountFromTotal =
      total !== null && partPrice !== null ? roundAmount(total - partPrice) : null;
    const userLabourAmount = amountValue(operation.userLabourAmount);
    const labourAmount =
      userLabourAmount && userLabourAmount > 0
        ? userLabourAmount
        : labourAmountFromTotal !== null
          ? labourAmountFromTotal
          : labourTime !== null && labourRate !== null
            ? roundAmount(labourTime * labourRate)
            : null;
    const ingredientsAmount =
      operation.actionId === PAINT_TASK_TYPE
        ? operation.paintInfo?.totalMaterial ?? partPrice
        : null;

    return {
      operationId: operation.operationId,
      actionId: operation.actionId,
      operation: operation.actionDescription,
      part: {
        id: operation.cupi,
        label: operation.partDescription,
      },
      reference:
        operation.referenceCode?.value ?? operation.oemReferenceCode ?? null,
      oemReference: operation.oemReferenceCode ?? null,
      oemPrice: operation.oemReferencePresentPrice ?? null,
      partPrice,
      labourTime,
      labourRate,
      labourRateLabel: operation.pricePerHour ?? null,
      labourAmount,
      ingredientsAmount,
      total,
      precalculation: operation.precalculusInformation ?? null,
      job: operation.job ?? null,
      technicity: operation.technicity ?? null,
      currency: 'EUR',
      children:
        operation.operationChildren?.map((child) => ({
          operationId: child.operationId,
          actionId: child.actionId,
          operation: child.actionDescription,
          reference: child.referenceCode?.value ?? child.oemReferenceCode ?? null,
          partPrice: amountValue(child.priceMaterialAmount),
          labourTime: amountValue(child.labourTime),
          labourAmount:
            amountValue(child.total) !== null &&
            amountValue(child.priceMaterialAmount) !== null
              ? roundAmount(
                  (amountValue(child.total) ?? 0) -
                    (amountValue(child.priceMaterialAmount) ?? 0),
                )
              : null,
          total: amountValue(child.total),
        })) ?? [],
    };
  }

  private extractVehicle(
    estimate: JsonObject,
    plateSearchData: unknown,
    registrationNumber?: string,
    vin?: string,
  ) {
    const make = findFirstString(estimate, [
      'makeName',
      'make',
      'brandName',
      'manufacturerName',
    ]);
    const model = findFirstString(estimate, ['modelName', 'model', 'modelDescription']);
    const makeCode =
      findFirstString(estimate, ['makeCode', 'manufacturerCode', 'brandCode']) ??
      findFirstString(plateSearchData, ['makeCode', 'manufacturerCode', 'brandCode']);
    const modelId =
      findFirstString(estimate, ['modelId', 'modelCode', 'gtModelId']) ??
      findFirstString(plateSearchData, ['modelId', 'modelCode', 'gtModelId']);
    const navigationModelCode =
      findFirstString(estimate, [
        'navigationModelCode',
        'modelNavigationCode',
        'modelCum',
        'cum',
      ]) ??
      findFirstString(plateSearchData, [
        'navigationModelCode',
        'modelNavigationCode',
        'modelCum',
        'cum',
      ]);
    const equipment =
      extractSelectedEquipmentCode(estimate) ??
      extractSelectedEquipmentCode(plateSearchData) ??
      findFirstString(estimate, ['equipment', 'equipmentCode']) ??
      findFirstString(plateSearchData, ['equipment', 'equipmentCode']);
    const version = findFirstString(estimate, [
      'versionName',
      'subModelName',
      'bodyName',
    ]);
    const plate =
      registrationNumber ??
      findFirstString(estimate, ['plateNumber', 'registrationNumber']) ??
      findFirstString(plateSearchData, ['plateNumber', 'registrationNumber']);
    const resolvedVin =
      vin ?? extractVin(estimate) ?? extractVin(plateSearchData);

    return {
      make: make ?? null,
      model: model ?? null,
      version: version ?? null,
      registrationNumber: plate ?? null,
      vin: resolvedVin ?? null,
      makeCode: makeCode ?? null,
      modelId: modelId ?? null,
      navigationModelCode: navigationModelCode ?? null,
      equipment: equipment ?? null,
      label: [make, model, version].filter(Boolean).join(' ') || null,
    };
  }

  private assertVehicleResolved(
    vehicle: ReturnType<GtmotiveService['extractVehicle']>,
    estimateId: number,
    context: JsonObject = {},
  ) {
    const hasVinOrPlate = Boolean(vehicle.vin || vehicle.registrationNumber);
    const hasMake = Boolean(vehicle.make || vehicle.makeCode);
    const hasModel = Boolean(vehicle.model || vehicle.modelId);

    if (hasVinOrPlate && hasMake && hasModel) return;

    this.logger.warn(
      `vehicle unresolved estimateId=${estimateId} vehicle=${previewForLog(vehicle)} context=${previewForLog(context)}`,
    );
    throw new BadGatewayException({
      message:
        'Vehicule non resolu par GT Motive. Impossible de charger les pieces.',
      estimateId,
      nextStep:
        'Relancer VIN Query ou demander une selection manuelle marque/modele.',
      context: {
        ...context,
        vehicle,
        checks: {
          hasVinOrPlate,
          hasMake,
          hasModel,
        },
      },
    });
  }

  private isVehicleResolvedEnough(
    vehicle: ReturnType<GtmotiveService['extractVehicle']>,
  ) {
    const hasVinOrPlate = Boolean(vehicle.vin || vehicle.registrationNumber);
    const hasMake = Boolean(vehicle.make || vehicle.makeCode);
    const hasModel = Boolean(vehicle.model || vehicle.modelId);
    return hasVinOrPlate && hasMake && hasModel;
  }

  private toNavigationBoardResponse(board?: NavigationBoard) {
    if (!board) {
      return this.fallbackNavigationBoard(
        'Aucune navigation board retournee par GT Motive.',
      );
    }

    const boardId = board.id ? String(board.id) : null;
    return {
      id: board.id ?? null,
      description: board.description ?? null,
      svgUrl: boardId
        ? `/api/gtmotive/assets/navigation-board/${boardId}.svg${extractVersionQuery(board.svg)}`
        : null,
      images:
        board.images?.map((image) => ({
          width: image.width ?? null,
          url: image.url
            ? `/api/gtmotive/assets/navigation-board-image/${extractLastPathSegment(image.url)}`
            : null,
        })) ?? [],
      functionalGroups: normalizeFunctionalGroups(board.functionalGroups),
      fallback: false,
      message: null,
    };
  }

  private getBaseUrl() {
    return this.configService.get<string>('GTMOTIVE_BASE_URL') ?? DEFAULT_BASE_URL;
  }

  private getGtapiBaseUrl() {
    return (
      this.configService.get<string>('GTMOTIVE_GTAPI_BASE_URL') ??
      DEFAULT_GTAPI_BASE_URL
    );
  }

  private getGtapiKey() {
    return this.configService.get<string>('GTMOTIVE_GTAPI_KEY') ?? DEFAULT_GTAPI_KEY;
  }

  private getBillingCodeId() {
    return Number(
      this.configService.get<string>('GTMOTIVE_BILLING_CODE_ID') ??
        DEFAULT_BILLING_CODE_ID,
    );
  }

  private getEstimateProfileId() {
    return Number(
      this.configService.get<string>('GTMOTIVE_ESTIMATE_PROFILE_ID') ??
        DEFAULT_ESTIMATE_PROFILE_ID,
    );
  }

  private getFunctionalGroupId() {
    return (
      this.configService.get<string>('GTMOTIVE_FUNCTIONAL_GROUP_ID') ??
      DEFAULT_FUNCTIONAL_GROUP_ID
    );
  }

  private resolveFallbackVin(registrationNumber?: string) {
    const configuredVin = this.configService.get<string>('GTMOTIVE_TEST_VIN');
    if (configuredVin) return configuredVin;

    const configuredRegistration =
      this.configService.get<string>('GTMOTIVE_TEST_IMMAT') ??
      DEFAULT_TEST_REGISTRATION_NUMBER;
    if (
      registrationNumber &&
      normalizeLicenseIdentifier(registrationNumber) ===
        normalizeLicenseIdentifier(configuredRegistration)
    ) {
      return DEFAULT_TEST_VIN;
    }

    return undefined;
  }

  private requiredConfig(name: string) {
    const value = this.configService.get<string>(name);
    if (!value) {
      throw new ServiceUnavailableException(
        `Variable d'environnement manquante: ${name}`,
      );
    }
    return value;
  }

  private generateEstimateCode() {
    const now = new Date();
    const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const random = String(Math.floor(Math.random() * 100)).padStart(2, '0');
    return `${date}${String(Date.now()).slice(-5)}${random}`;
  }
}

async function parseResponseBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return '';

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function amountValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const numeric = Number(value.replace(',', '.'));
    return Number.isFinite(numeric) ? numeric : null;
  }
  if (!value || typeof value !== 'object') return null;

  const nested = (value as JsonObject).value;
  if (typeof nested === 'number' && Number.isFinite(nested)) return nested;
  if (typeof nested === 'string') {
    const numeric = Number(nested.replace(',', '.'));
    return Number.isFinite(numeric) ? numeric : null;
  }

  return null;
}

function parseHourlyRate(value?: string): number | null {
  if (!value) return null;
  const match = value.replace(/\s/g, '').match(/(\d+(?:[,.]\d+)?)/);
  if (!match) return null;

  const numeric = Number(match[1].replace(',', '.'));
  return Number.isFinite(numeric) ? numeric : null;
}

function roundAmount(value: number): number {
  return Math.round(value * 100) / 100;
}

function isOperationBusinessFailure(value: unknown): boolean {
  if (Array.isArray(value)) return value.some((item) => isOperationBusinessFailure(item));
  if (!value || typeof value !== 'object') return false;

  const source = value as JsonObject;
  if (source.success === false) return true;

  const operationError = Number(source.operationError);
  if (Number.isFinite(operationError) && operationError !== 0) return true;

  const code = Number(source.code);
  return Number.isFinite(code) && code !== 0 && source.success !== true;
}

function stringFromObject(
  value: unknown,
  keys: string[],
): string | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const source = value as JsonObject;
  for (const key of keys) {
    const candidate = source[key];
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate;
    }
  }
  return undefined;
}

function findFirstString(value: unknown, keys: string[], depth = 0): string | undefined {
  if (!value || depth > 4) return undefined;

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findFirstString(item, keys, depth + 1);
      if (found) return found;
    }
    return undefined;
  }

  if (typeof value !== 'object') return undefined;

  const source = value as JsonObject;
  const normalizedKeys = keys.map((key) => key.toLowerCase());
  for (const [key, item] of Object.entries(source)) {
    if (
      normalizedKeys.includes(key.toLowerCase()) &&
      typeof item === 'string' &&
      item.trim()
    ) {
      return item;
    }
  }

  for (const item of Object.values(source)) {
    const found = findFirstString(item, keys, depth + 1);
    if (found) return found;
  }

  return undefined;
}

function findFirstNumber(value: unknown, keys: string[], depth = 0): number | undefined {
  if (!value || depth > 4) return undefined;

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findFirstNumber(item, keys, depth + 1);
      if (found !== undefined) return found;
    }
    return undefined;
  }

  if (typeof value !== 'object') return undefined;

  const source = value as JsonObject;
  const normalizedKeys = keys.map((key) => key.toLowerCase());
  for (const [key, item] of Object.entries(source)) {
    if (normalizedKeys.includes(key.toLowerCase())) {
      const numericValue =
        typeof item === 'number'
          ? item
          : typeof item === 'string'
            ? Number(item)
            : Number.NaN;
      if (Number.isFinite(numericValue)) return numericValue;
    }
  }

  for (const item of Object.values(source)) {
    const found = findFirstNumber(item, keys, depth + 1);
    if (found !== undefined) return found;
  }

  return undefined;
}

function extractVin(value: unknown, depth = 0): string | undefined {
  if (!value || depth > 5) return undefined;

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = extractVin(item, depth + 1);
      if (found) return found;
    }
    return undefined;
  }

  if (typeof value !== 'object') return undefined;

  const direct = findFirstString(value, [
    'vin',
    'vinCode',
    'vinNumber',
    'vehicleIdentificationNumber',
    'chassisNumber',
    'frameNumber',
  ]);
  if (direct) return direct;

  for (const [key, item] of Object.entries(value as JsonObject)) {
    const normalizedKey = key.toLowerCase();
    if (
      (normalizedKey.includes('vin') ||
        normalizedKey.includes('chassis') ||
        normalizedKey.includes('identificationnumber')) &&
      typeof item === 'string' &&
      item.trim()
    ) {
      return item;
    }
  }

  for (const item of Object.values(value as JsonObject)) {
    const found = extractVin(item, depth + 1);
    if (found) return found;
  }

  return undefined;
}

function extractSelectedEquipmentCode(
  value: unknown,
  depth = 0,
): string | undefined {
  if (!value || depth > 5) return undefined;

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = extractSelectedEquipmentCode(item, depth + 1);
      if (found) return found;
    }
    return undefined;
  }

  if (typeof value !== 'object') return undefined;

  const source = value as JsonObject;
  const selectedEquipments = source.selectedEquipments;
  if (Array.isArray(selectedEquipments)) {
    for (const equipment of selectedEquipments) {
      const code = stringFromObject(equipment, ['code', 'value']);
      if (code) return code;
    }
  }

  for (const item of Object.values(source)) {
    const found = extractSelectedEquipmentCode(item, depth + 1);
    if (found) return found;
  }

  return undefined;
}

function extractSelectedEquipmentCodes(value: unknown): string[] {
  const equipments = findSelectedEquipments(value);
  return uniqueStrings(
    equipments
      .filter((equipment) => !isManufacturingEquipment(equipment))
      .map((equipment) => stringFromObject(equipment, ['code', 'value']))
      .filter((code): code is string => Boolean(code)),
  );
}

function extractManufacturingValues(value: unknown): string[] {
  const equipments = findSelectedEquipments(value);
  return uniqueStrings(
    equipments
      .filter(isManufacturingEquipment)
      .map((equipment) => {
        const code =
          stringFromObject(equipment, ['subFamilyCode', 'familyCode']) ?? '';
        let equipmentValue =
          stringFromObject(equipment, ['value', 'code']) ?? '';

        if (code === 'FEC' && equipmentValue.length >= 10) {
          equipmentValue = equipmentValue.slice(0, 10);
        }

        return code && equipmentValue ? `${code} ${equipmentValue}` : '';
      })
      .filter(Boolean),
  );
}

function findSelectedEquipments(value: unknown, depth = 0): JsonObject[] {
  if (!value || depth > 5) return [];

  if (Array.isArray(value)) {
    return value.flatMap((item) => findSelectedEquipments(item, depth + 1));
  }

  if (typeof value !== 'object') return [];

  const source = value as JsonObject;
  const selectedEquipments = source.selectedEquipments;
  if (Array.isArray(selectedEquipments)) {
    return selectedEquipments.filter(
      (equipment): equipment is JsonObject =>
        Boolean(equipment) && typeof equipment === 'object',
    );
  }

  return Object.values(source).flatMap((item) =>
    findSelectedEquipments(item, depth + 1),
  );
}

function isManufacturingEquipment(equipment: JsonObject): boolean {
  const code =
    stringFromObject(equipment, ['subFamilyCode', 'familyCode']) ?? '';
  return ['FEC', 'PMT', 'NMT'].includes(code);
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.trim()))];
}

function sanitizeGtmotiveError(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeGtmotiveError);
  if (!value || typeof value !== 'object') return value;

  const output: JsonObject = {};
  for (const [key, item] of Object.entries(value as JsonObject)) {
    const lower = key.toLowerCase();
    output[key] =
      lower.includes('token') ||
      lower.includes('password') ||
      lower.includes('secret')
        ? '[redacted]'
        : sanitizeGtmotiveError(item);
  }

  return output;
}

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function normalizeLicenseIdentifier(value: string): string {
  return normalize(value).replace(/[^a-z0-9]/g, '');
}

function extractLastPathSegment(value: string): string {
  const url = new URL(value);
  return url.pathname.split('/').filter(Boolean).at(-1) ?? value;
}

function extractVersionQuery(value?: string): string {
  if (!value) return '';
  const url = new URL(value);
  const version = url.searchParams.get('version');
  return version ? `?version=${encodeURIComponent(version)}` : '';
}

function appendQueryParam(url: string, name: string, value: string) {
  const parsed = new URL(url);
  if (!parsed.searchParams.has(name)) {
    parsed.searchParams.set(name, value);
  }
  return parsed.toString();
}

function redactUrl(value: string): string {
  try {
    const url = new URL(value);
    if (url.searchParams.has('ApiKey')) {
      url.searchParams.set('ApiKey', '[redacted]');
    }
    return url.toString();
  } catch {
    return value.replace(/(ApiKey=)[^&]+/i, '$1[redacted]');
  }
}

function previewForLog(value: unknown): string {
  const text =
    typeof value === 'string'
      ? value
      : JSON.stringify(sanitizeGtmotiveError(value));
  return text.slice(0, 500);
}

function extractResultMessage(value: unknown): string | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const source = value as JsonObject;
  const resultMessage = source.resultMessage;

  if (typeof resultMessage === 'string') return resultMessage;
  if (resultMessage && typeof resultMessage === 'object') {
    const text = (resultMessage as JsonObject).text;
    if (typeof text === 'string' && text.trim()) return text;
  }

  const message = source.message;
  if (typeof message === 'string' && message.trim()) return message;

  return undefined;
}

function isDuplicateEstimateCode(value: unknown): boolean {
  return normalize(extractResultMessage(value) ?? '').includes(
    'existe deja un code',
  );
}

function isVinQueryAlreadyMade(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const source = value as JsonObject;
  return (
    source.code === 'VinQueryAlreadyMade' ||
    normalize(String(source.message ?? '')).includes('already been made')
  );
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeFunctionalGroups(groups?: JsonObject[]) {
  return (
    groups
      ?.map((group) => {
        const id = String(
          group.id ??
            group.functionalGroupId ??
            group.groupId ??
            group.code ??
            group.functionalGroupCode ??
            '',
        ).trim();
        if (!id) return null;

        const description =
          stringFromObject(group, [
            'description',
            'name',
            'label',
            'text',
            'functionalGroupDescription',
            'groupDescription',
          ]) ??
          FUNCTIONAL_GROUP_LABELS[id] ??
          `Groupe ${id}`;

        return { id, description };
      })
      .filter((group): group is { id: string; description: string } =>
        Boolean(group),
      ) ?? []
  );
}
