import { Injectable } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/client';
import ExcelJS from 'exceljs';
import {
  Prisma,
  PartOrderStatus,
  Role,
  VehicleCheckItemOperationalStatus,
  VehicleCheckStatus,
} from '../../prisma/generated/client.cjs';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { formatLicensePlate } from '../common/utils/license-plate';
import { PrismaService } from '../prisma/prisma.service';
import { ExportDashboardKpisQueryDto } from './dto/export-dashboard-kpis-query.dto';
import { ExportVehicleChecksQueryDto } from './dto/export-vehicle-checks-query.dto';

const preferredRepairTypeCodes = [
  'LUGGAGE_COVER',
  'SERVICING',
  'CABLE',
  'TIRE',
  'RIM',
  'BODYWORK',
  'UPHOLSTERY',
  'OPTIC',
];

const dashboardKpiDefinitions = [
  { key: 'vehicleChecks', label: 'Véhicules contrôlés', format: 'integer' },
  { key: 'completed', label: 'Contrôles terminés', format: 'integer' },
  { key: 'toAnalyze', label: 'Dossiers à analyser', format: 'integer' },
  { key: 'draft', label: 'Brouillons', format: 'integer' },
  {
    key: 'repairQuantity',
    label: 'Quantité de réparations',
    format: 'integer',
  },
  {
    key: 'vehiclesWithRepairs',
    label: 'Véhicules avec réparations',
    format: 'integer',
  },
  {
    key: 'averageRepairsPerVehicle',
    label: 'Réparations moyennes par véhicule',
    format: 'decimal',
  },
  { key: 'partOrders', label: 'Commandes de pièces', format: 'integer' },
  { key: 'totalSavings', label: 'Économies totales', format: 'money' },
  {
    key: 'averageSavings',
    label: 'Économie moyenne par véhicule',
    format: 'money',
  },
  { key: 'totalInternalCost', label: 'Coût interne total', format: 'money' },
  { key: 'totalDifference', label: 'Différence totale', format: 'money' },
] as const;

type DashboardKpiKey = (typeof dashboardKpiDefinitions)[number]['key'];

const defaultDashboardKpis: DashboardKpiKey[] = [
  'vehicleChecks',
  'completed',
  'toAnalyze',
  'repairQuantity',
  'totalSavings',
  'totalInternalCost',
  'totalDifference',
  'partOrders',
];

const dashboardBreakdownKeys = [
  'partsBreakdown',
  'repairTypesBreakdown',
] as const;
type DashboardBreakdownKey = (typeof dashboardBreakdownKeys)[number];
type DashboardGroupBy = 'agency' | 'collaborator' | 'manufacturer' | 'none';

@Injectable()
export class ExportsService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboardKpisWorkbook(
    query: ExportDashboardKpisQueryDto = {},
    user: CurrentUserPayload,
  ): Promise<Buffer> {
    const selectedValues = new Set(this.commaSeparatedValues(query.kpis));
    const selectedKpis = dashboardKpiDefinitions.filter((definition) =>
      selectedValues.size
        ? selectedValues.has(definition.key)
        : defaultDashboardKpis.includes(definition.key),
    );
    const selectedBreakdowns = new Set<DashboardBreakdownKey>(
      dashboardBreakdownKeys.filter((key) => selectedValues.has(key)),
    );
    const selectedPartCodes = new Set(
      this.commaSeparatedValues(query.partCodes),
    );
    const groupBy = this.dashboardGroupBy(query.groupBy);

    const vehicleChecks = await this.prisma.vehicleCheck.findMany({
      where: this.vehicleCheckWhere(query, user),
      include: {
        agency: { select: { id: true, name: true } },
        collaborator: {
          select: { id: true, firstName: true, lastName: true },
        },
        manufacturer: { select: { id: true, name: true } },
        items: {
          where: {
            operationalStatus: VehicleCheckItemOperationalStatus.ACTIVE,
            selectedForSummary: true,
          },
          include: { repairType: true, vehiclePart: true },
        },
      },
      orderBy: { checkDate: 'desc' },
    });

    const metricsForChecks = (checks: typeof vehicleChecks) => {
      const repairQuantity = checks.reduce(
        (total, check) =>
          total + check.items.reduce((sum, item) => sum + item.quantity, 0),
        0,
      );
      const totalSavings = checks.reduce(
        (total, check) => total + this.number(check.totalInternalSavingAmount),
        0,
      );

      return {
        averageRepairsPerVehicle: checks.length
          ? repairQuantity / checks.length
          : 0,
        averageSavings: checks.length ? totalSavings / checks.length : 0,
        completed: checks.filter(
          (check) =>
            check.status === VehicleCheckStatus.CLOSED_NO_DAMAGE ||
            check.status === VehicleCheckStatus.COMPLETED,
        ).length,
        draft: checks.filter(
          (check) => check.status === VehicleCheckStatus.DRAFT,
        ).length,
        partOrders: checks.reduce(
          (total, check) =>
            total +
            check.items.filter(
              (item) => item.partOrderStatus === PartOrderStatus.TO_ORDER,
            ).length,
          0,
        ),
        repairQuantity,
        toAnalyze: checks.filter(
          (check) => check.status === VehicleCheckStatus.TO_ANALYZE,
        ).length,
        totalDifference: checks.reduce(
          (total, check) => total + this.number(check.totalDifferenceAmount),
          0,
        ),
        totalInternalCost: checks.reduce(
          (total, check) => total + this.number(check.totalInternalCost),
          0,
        ),
        totalSavings,
        vehicleChecks: checks.length,
        vehiclesWithRepairs: checks.filter((check) => check.items.length > 0)
          .length,
      } satisfies Record<DashboardKpiKey, number>;
    };

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Readyline';
    workbook.created = new Date();
    workbook.modified = new Date();

    const summaryWorksheet = workbook.addWorksheet('Indicateurs', {
      views: [{ state: 'frozen', ySplit: 4 }],
    });
    summaryWorksheet.columns = [
      { key: 'indicator', width: 42 },
      { key: 'value', width: 24 },
    ];
    this.addDashboardSheetTitle(
      summaryWorksheet,
      'Indicateurs du tableau de bord',
      2,
      query,
    );
    summaryWorksheet.getRow(4).values = ['Indicateur', 'Valeur'];
    this.styleDashboardHeader(summaryWorksheet, 4);

    const metrics = metricsForChecks(vehicleChecks);
    for (const definition of selectedKpis) {
      const row = summaryWorksheet.addRow({
        indicator: definition.label,
        value: metrics[definition.key],
      });
      this.formatDashboardValue(row.getCell(2), definition.format);
    }
    this.styleDashboardBody(summaryWorksheet, 5, 2);

    if (groupBy !== 'none') {
      const groupedWorksheet = workbook.addWorksheet(
        this.dashboardGroupSheetName(groupBy),
        { views: [{ state: 'frozen', ySplit: 4 }] },
      );
      groupedWorksheet.columns = [
        { key: 'group', width: 34 },
        ...selectedKpis.map((definition) => ({
          key: definition.key,
          width: definition.format === 'money' ? 20 : 18,
        })),
      ];
      this.addDashboardSheetTitle(
        groupedWorksheet,
        `Indicateurs par ${this.dashboardGroupLabel(groupBy)}`,
        selectedKpis.length + 1,
        query,
      );
      groupedWorksheet.getRow(4).values = [
        this.dashboardGroupLabel(groupBy),
        ...selectedKpis.map((definition) => definition.label),
      ];
      this.styleDashboardHeader(groupedWorksheet, 4);

      const groups = new Map<
        string,
        { label: string; checks: typeof vehicleChecks }
      >();
      for (const check of vehicleChecks) {
        const group = this.dashboardCheckGroup(check, groupBy);
        const current: { label: string; checks: typeof vehicleChecks } =
          groups.get(group.id) ?? { label: group.label, checks: [] };
        current.checks.push(check);
        groups.set(group.id, current);
      }

      for (const group of [...groups.values()].sort((first, second) =>
        first.label.localeCompare(second.label, 'fr'),
      )) {
        const groupMetrics = metricsForChecks(group.checks);
        const row = groupedWorksheet.addRow([
          group.label,
          ...selectedKpis.map((definition) => groupMetrics[definition.key]),
        ]);
        selectedKpis.forEach((definition, index) =>
          this.formatDashboardValue(row.getCell(index + 2), definition.format),
        );
      }
      this.styleDashboardBody(groupedWorksheet, 5, selectedKpis.length + 1);
    }

    if (selectedBreakdowns.has('partsBreakdown')) {
      this.addPartsBreakdownWorksheet(
        workbook,
        vehicleChecks,
        selectedPartCodes,
        query,
      );
    }

    if (selectedBreakdowns.has('repairTypesBreakdown')) {
      this.addRepairTypesBreakdownWorksheet(workbook, vehicleChecks, query);
    }

    const xlsxBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(xlsxBuffer);
  }

  private addPartsBreakdownWorksheet(
    workbook: ExcelJS.Workbook,
    checks: Array<{
      id: string;
      items: Array<{
        quantity: number;
        totalInternalCost: Decimal;
        totalInternalSavingAmount: Decimal;
        vehiclePart: { category: string | null; code: string; name: string };
      }>;
    }>,
    selectedPartCodes: Set<string>,
    query: ExportDashboardKpisQueryDto,
  ) {
    const worksheet = workbook.addWorksheet('Reparations par piece', {
      views: [{ state: 'frozen', ySplit: 4 }],
    });
    worksheet.columns = [
      { key: 'part', width: 34 },
      { key: 'category', width: 22 },
      { key: 'vehicles', width: 20 },
      { key: 'interventions', width: 18 },
      { key: 'quantity', width: 16 },
      { key: 'savings', width: 20 },
      { key: 'cost', width: 20 },
    ];
    this.addDashboardSheetTitle(worksheet, 'Réparations par pièce', 7, query);
    worksheet.getRow(4).values = [
      'Pièce',
      'Catégorie',
      'Véhicules concernés',
      'Interventions',
      'Quantité',
      'Économie réalisée',
      'Coût interne',
    ];
    this.styleDashboardHeader(worksheet, 4);

    const rows = new Map<
      string,
      {
        category: string;
        cost: number;
        interventions: number;
        name: string;
        quantity: number;
        savings: number;
        vehicleIds: Set<string>;
      }
    >();

    for (const check of checks) {
      for (const item of check.items) {
        const part = item.vehiclePart;
        if (selectedPartCodes.size && !selectedPartCodes.has(part.code)) {
          continue;
        }
        const row = rows.get(part.code) ?? {
          category: part.category ?? 'Non classée',
          cost: 0,
          interventions: 0,
          name: part.name,
          quantity: 0,
          savings: 0,
          vehicleIds: new Set<string>(),
        };
        row.vehicleIds.add(check.id);
        row.interventions += 1;
        row.quantity += item.quantity;
        row.savings += this.number(item.totalInternalSavingAmount);
        row.cost += this.number(item.totalInternalCost);
        rows.set(part.code, row);
      }
    }

    for (const item of [...rows.values()].sort(
      (first, second) =>
        second.quantity - first.quantity ||
        first.name.localeCompare(second.name, 'fr'),
    )) {
      const row = worksheet.addRow({
        category: item.category,
        cost: item.cost,
        interventions: item.interventions,
        part: item.name,
        quantity: item.quantity,
        savings: item.savings,
        vehicles: item.vehicleIds.size,
      });
      row.getCell('savings').numFmt = '#,##0.00 €';
      row.getCell('cost').numFmt = '#,##0.00 €';
    }
    this.styleDashboardBody(worksheet, 5, 7);
  }

  private addRepairTypesBreakdownWorksheet(
    workbook: ExcelJS.Workbook,
    checks: Array<{
      id: string;
      items: Array<{
        quantity: number;
        repairType: { code: string; name: string };
        totalInternalCost: Decimal;
        totalInternalSavingAmount: Decimal;
      }>;
    }>,
    query: ExportDashboardKpisQueryDto,
  ) {
    const worksheet = workbook.addWorksheet('Reparations par type', {
      views: [{ state: 'frozen', ySplit: 4 }],
    });
    worksheet.columns = [
      { key: 'repairType', width: 36 },
      { key: 'vehicles', width: 20 },
      { key: 'interventions', width: 18 },
      { key: 'quantity', width: 16 },
      { key: 'savings', width: 20 },
      { key: 'cost', width: 20 },
    ];
    this.addDashboardSheetTitle(worksheet, 'Réparations par type', 6, query);
    worksheet.getRow(4).values = [
      'Type de réparation',
      'Véhicules concernés',
      'Interventions',
      'Quantité',
      'Économie réalisée',
      'Coût interne',
    ];
    this.styleDashboardHeader(worksheet, 4);

    const rows = new Map<
      string,
      {
        cost: number;
        interventions: number;
        name: string;
        quantity: number;
        savings: number;
        vehicleIds: Set<string>;
      }
    >();

    for (const check of checks) {
      for (const item of check.items) {
        const repairType = item.repairType;
        const row = rows.get(repairType.code) ?? {
          cost: 0,
          interventions: 0,
          name: repairType.name,
          quantity: 0,
          savings: 0,
          vehicleIds: new Set<string>(),
        };
        row.vehicleIds.add(check.id);
        row.interventions += 1;
        row.quantity += item.quantity;
        row.savings += this.number(item.totalInternalSavingAmount);
        row.cost += this.number(item.totalInternalCost);
        rows.set(repairType.code, row);
      }
    }

    for (const item of [...rows.values()].sort(
      (first, second) =>
        second.quantity - first.quantity ||
        first.name.localeCompare(second.name, 'fr'),
    )) {
      const row = worksheet.addRow({
        cost: item.cost,
        interventions: item.interventions,
        quantity: item.quantity,
        repairType: item.name,
        savings: item.savings,
        vehicles: item.vehicleIds.size,
      });
      row.getCell('savings').numFmt = '#,##0.00 €';
      row.getCell('cost').numFmt = '#,##0.00 €';
    }
    this.styleDashboardBody(worksheet, 5, 6);
  }

  private addDashboardSheetTitle(
    worksheet: ExcelJS.Worksheet,
    title: string,
    columnCount: number,
    query: ExportDashboardKpisQueryDto,
  ) {
    worksheet.mergeCells(1, 1, 1, columnCount);
    const titleCell = worksheet.getCell(1, 1);
    titleCell.value = title;
    titleCell.font = { bold: true, size: 16, color: { argb: 'FF111827' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
    worksheet.getRow(1).height = 28;

    worksheet.mergeCells(2, 1, 2, columnCount);
    const periodCell = worksheet.getCell(2, 1);
    periodCell.value = `Période : ${query.dateFrom ?? 'début'} au ${query.dateTo ?? 'aujourd’hui'}`;
    periodCell.font = { italic: true, color: { argb: 'FF64748B' } };
    worksheet.getRow(3).height = 8;
  }

  private styleDashboardHeader(
    worksheet: ExcelJS.Worksheet,
    rowNumber: number,
  ) {
    const row = worksheet.getRow(rowNumber);
    row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    row.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F766E' },
    };
    row.alignment = {
      horizontal: 'center',
      vertical: 'middle',
      wrapText: true,
    };
    row.height = 34;
    worksheet.autoFilter = {
      from: { row: rowNumber, column: 1 },
      to: { row: rowNumber, column: worksheet.columnCount },
    };
  }

  private styleDashboardBody(
    worksheet: ExcelJS.Worksheet,
    firstRow: number,
    columnCount: number,
  ) {
    for (
      let rowNumber = firstRow;
      rowNumber <= worksheet.rowCount;
      rowNumber += 1
    ) {
      const row = worksheet.getRow(rowNumber);
      row.height = 22;
      for (let column = 1; column <= columnCount; column += 1) {
        const cell = row.getCell(column);
        cell.border = {
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };
        cell.alignment = {
          horizontal: column === 1 ? 'left' : 'center',
          vertical: 'middle',
        };
      }
    }
  }

  private formatDashboardValue(
    cell: ExcelJS.Cell,
    format: 'decimal' | 'integer' | 'money',
  ) {
    if (format === 'money') cell.numFmt = '#,##0.00 €';
    if (format === 'integer') cell.numFmt = '#,##0';
    if (format === 'decimal') cell.numFmt = '#,##0.00';
  }

  private commaSeparatedValues(value?: string) {
    return (value ?? '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private dashboardGroupBy(value?: string): DashboardGroupBy {
    if (
      value === 'agency' ||
      value === 'collaborator' ||
      value === 'manufacturer'
    ) {
      return value;
    }
    return 'none';
  }

  private dashboardGroupLabel(groupBy: Exclude<DashboardGroupBy, 'none'>) {
    if (groupBy === 'agency') return 'agence';
    if (groupBy === 'collaborator') return 'collaborateur';
    return 'constructeur';
  }

  private dashboardGroupSheetName(groupBy: Exclude<DashboardGroupBy, 'none'>) {
    if (groupBy === 'agency') return 'Par agence';
    if (groupBy === 'collaborator') return 'Par collaborateur';
    return 'Par constructeur';
  }

  private dashboardCheckGroup(
    check: {
      agency: { id: string; name: string };
      collaborator: { id: string; firstName: string; lastName: string };
      manufacturer: { id: string; name: string };
    },
    groupBy: Exclude<DashboardGroupBy, 'none'>,
  ) {
    if (groupBy === 'agency') {
      return { id: check.agency.id, label: check.agency.name };
    }
    if (groupBy === 'manufacturer') {
      return { id: check.manufacturer.id, label: check.manufacturer.name };
    }
    return {
      id: check.collaborator.id,
      label:
        `${check.collaborator.firstName} ${check.collaborator.lastName}`.trim(),
    };
  }

  async vehicleChecksWorkbook(
    query: ExportVehicleChecksQueryDto = {},
    user: CurrentUserPayload,
  ): Promise<Buffer> {
    const [repairTypes, vehicleChecks] = await Promise.all([
      this.prisma.repairType.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.vehicleCheck.findMany({
        where: this.vehicleCheckWhere(query, user),
        include: {
          collaborator: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          manufacturer: true,
          vehicleModel: true,
          agency: true,
          items: {
            include: { repairType: true, vehiclePart: true },
          },
        },
        orderBy: { checkDate: 'desc' },
      }),
    ]);

    const orderedRepairTypes = this.orderRepairTypes(repairTypes);
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Readyline';
    workbook.created = new Date();
    workbook.modified = new Date();

    const worksheet = workbook.addWorksheet('Synthese reparations', {
      views: [{ state: 'frozen', ySplit: 3 }],
      properties: { defaultRowHeight: 22 },
    });

    const fixedColumns = [
      { header: 'Collaborateur', key: 'collaborator', width: 18 },
      { header: 'Date du contrôle', key: 'checkDate', width: 16 },
      { header: 'Ville', key: 'city', width: 16 },
      { header: 'Constructeur', key: 'manufacturer', width: 18 },
      { header: 'Immatriculation', key: 'licensePlate', width: 18 },
    ];

    const repairColumns = orderedRepairTypes.map((repairType) => ({
      header: repairType.name,
      key: `repair_${repairType.code}`,
      width: Math.max(14, repairType.name.length + 2),
    }));

    const totalColumns = [
      {
        header: 'Economie réalisée',
        key: 'totalInternalSavingAmount',
        width: 18,
      },
    ];

    const columns = [...fixedColumns, ...repairColumns, ...totalColumns];
    worksheet.columns = columns.map((column) => ({
      key: column.key,
      width: column.width,
    }));

    worksheet.mergeCells(1, 1, 1, columns.length);
    const titleCell = worksheet.getCell(1, 1);
    titleCell.value = 'Synthèse des réparations';
    titleCell.font = { bold: true, size: 16, color: { argb: 'FF111827' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
    worksheet.getRow(1).height = 28;

    worksheet.getRow(2).height = 8;
    worksheet.getRow(3).values = columns.map((column) => column.header);
    this.styleSummaryHeader(worksheet, 3);

    for (const check of vehicleChecks) {
      const quantitiesByRepairCode = new Map<string, number>();
      const activeItems = check.items.filter(
        (item) =>
          item.operationalStatus === VehicleCheckItemOperationalStatus.ACTIVE &&
          item.selectedForSummary,
      );

      for (const item of activeItems) {
        const currentQuantity =
          quantitiesByRepairCode.get(item.repairType.code) ?? 0;
        quantitiesByRepairCode.set(
          item.repairType.code,
          currentQuantity + item.quantity,
        );
      }

      const row: Record<string, string | number | Date | null> = {
        collaborator: `${check.collaborator.firstName} ${check.collaborator.lastName}`,
        checkDate: check.checkDate,
        city: check.city,
        manufacturer: check.manufacturer.name,
        licensePlate: formatLicensePlate(
          check.licensePlate,
          check.licensePlateCountry,
          check.licensePlateRaw,
        ),
        totalInternalSavingAmount: this.number(check.totalInternalSavingAmount),
      };

      for (const repairType of orderedRepairTypes) {
        row[`repair_${repairType.code}`] =
          quantitiesByRepairCode.get(repairType.code) ?? '';
      }

      worksheet.addRow(row);
    }

    this.styleSummaryBody(
      worksheet,
      columns.length,
      fixedColumns.length,
      repairColumns.length,
    );

    const repairTypesWorksheet = workbook.addWorksheet('Type reparations');
    repairTypesWorksheet.columns = [
      { key: 'repairType', width: 34 },
      { key: 'savingAmount', width: 20 },
    ];
    repairTypesWorksheet.getCell('A1').value = 'Type réparations';
    repairTypesWorksheet.getCell('A3').value = 'Type réparation effectuée';
    repairTypesWorksheet.getCell('B3').value = 'Economie réalisée';

    for (const repairType of orderedRepairTypes) {
      repairTypesWorksheet.addRow({
        repairType: repairType.name,
        savingAmount: this.number(repairType.defaultInternalSavingAmount),
      });
    }
    this.styleRepairTypesWorksheet(repairTypesWorksheet);

    const xlsxBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(xlsxBuffer);
  }

  private vehicleCheckWhere(
    query: ExportVehicleChecksQueryDto,
    user: CurrentUserPayload,
  ): Prisma.VehicleCheckWhereInput {
    const where: Prisma.VehicleCheckWhereInput = {
      ...this.scopeWhere(user),
      ...(query.collaboratorId ? { collaboratorId: query.collaboratorId } : {}),
    };

    if (query.dateFrom || query.dateTo) {
      where.checkDate = {
        ...(query.dateFrom ? { gte: this.startOfDay(query.dateFrom) } : {}),
        ...(query.dateTo ? { lte: this.endOfDay(query.dateTo) } : {}),
      };
    }

    return where;
  }

  private scopeWhere(user: CurrentUserPayload): Prisma.VehicleCheckWhereInput {
    if (user.role === Role.ADMIN) {
      return {};
    }

    if (user.role === Role.MANAGER) {
      return {
        OR: [
          { collaboratorId: user.sub },
          {
            collaborator: {
              managerAssignments: {
                some: { managerId: user.sub, isActive: true },
              },
            },
          },
        ],
      };
    }

    return {
      collaboratorId: user.sub,
    };
  }

  private startOfDay(value: string) {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  private endOfDay(value: string) {
    const date = new Date(value);
    date.setHours(23, 59, 59, 999);
    return date;
  }

  private orderRepairTypes<T extends { code: string }>(repairTypes: T[]): T[] {
    const positionByCode = new Map(
      preferredRepairTypeCodes.map((code, index) => [code, index]),
    );

    return [...repairTypes].sort((a, b) => {
      const positionA = positionByCode.get(a.code) ?? Number.MAX_SAFE_INTEGER;
      const positionB = positionByCode.get(b.code) ?? Number.MAX_SAFE_INTEGER;

      if (positionA !== positionB) return positionA - positionB;
      return a.code.localeCompare(b.code);
    });
  }

  private styleSummaryHeader(worksheet: ExcelJS.Worksheet, rowNumber: number) {
    const header = worksheet.getRow(rowNumber);
    header.font = { bold: true, color: { argb: 'FF1F2937' } };
    header.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD9D9D9' },
    };
    header.alignment = {
      vertical: 'middle',
      horizontal: 'center',
      wrapText: true,
    };
    header.height = 42;
    header.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF6B7280' } },
        left: { style: 'thin', color: { argb: 'FF6B7280' } },
        bottom: { style: 'thin', color: { argb: 'FF6B7280' } },
        right: { style: 'thin', color: { argb: 'FF6B7280' } },
      };
    });
    worksheet.autoFilter = {
      from: { row: rowNumber, column: 1 },
      to: { row: rowNumber, column: worksheet.columnCount },
    };
  }

  private styleSummaryBody(
    worksheet: ExcelJS.Worksheet,
    columnCount: number,
    fixedColumnCount: number,
    repairColumnCount: number,
  ) {
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber <= 3) return;

      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF9CA3AF' } },
          left: { style: 'thin', color: { argb: 'FF9CA3AF' } },
          bottom: { style: 'thin', color: { argb: 'FF9CA3AF' } },
          right: { style: 'thin', color: { argb: 'FF9CA3AF' } },
        };
        cell.alignment = {
          vertical: 'middle',
          horizontal: 'center',
          wrapText: true,
        };
      });
    });

    worksheet.getColumn('checkDate').numFmt = 'dd/mm/yyyy';
    worksheet.getColumn('totalInternalSavingAmount').numFmt = '#,##0.00 €';

    for (
      let rowNumber = 4;
      rowNumber <= Math.max(12, worksheet.rowCount);
      rowNumber += 1
    ) {
      const row = worksheet.getRow(rowNumber);
      for (let columnIndex = 1; columnIndex <= columnCount; columnIndex += 1) {
        const cell = row.getCell(columnIndex);
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF9CA3AF' } },
          left: { style: 'thin', color: { argb: 'FF9CA3AF' } },
          bottom: { style: 'thin', color: { argb: 'FF9CA3AF' } },
          right: { style: 'thin', color: { argb: 'FF9CA3AF' } },
        };
        cell.alignment = {
          vertical: 'middle',
          horizontal: 'center',
          wrapText: true,
        };
      }
      row.height = 22;
    }

    const firstRepairColumn = fixedColumnCount + 1;
    const lastRepairColumn = fixedColumnCount + repairColumnCount;
    for (
      let columnIndex = firstRepairColumn;
      columnIndex <= lastRepairColumn;
      columnIndex += 1
    ) {
      worksheet.getColumn(columnIndex).alignment = {
        horizontal: 'center',
        vertical: 'middle',
      };
    }
  }

  private styleSimpleHeader(worksheet: ExcelJS.Worksheet) {
    const header = worksheet.getRow(1);
    header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    header.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF111827' },
    };
    header.alignment = {
      vertical: 'middle',
      horizontal: 'center',
      wrapText: true,
    };
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: worksheet.columnCount },
    };
  }

  private styleRepairTypesWorksheet(worksheet: ExcelJS.Worksheet) {
    worksheet.getRow(1).height = 26;
    worksheet.getCell('A1').font = {
      bold: true,
      size: 16,
      color: { argb: 'FF111827' },
    };

    const header = worksheet.getRow(3);
    header.font = { bold: true, color: { argb: 'FF1F2937' } };
    header.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD9D9D9' },
    };
    header.alignment = { vertical: 'middle', horizontal: 'center' };
    header.height = 22;

    worksheet.autoFilter = {
      from: { row: 3, column: 1 },
      to: { row: 3, column: 2 },
    };
    worksheet.getColumn('savingAmount').numFmt = '#,##0.00 €';

    for (
      let rowNumber = 3;
      rowNumber <= Math.max(11, worksheet.rowCount);
      rowNumber += 1
    ) {
      const row = worksheet.getRow(rowNumber);
      row.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
        if (columnNumber > 2) return;
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF9CA3AF' } },
          left: { style: 'thin', color: { argb: 'FF9CA3AF' } },
          bottom: { style: 'thin', color: { argb: 'FF9CA3AF' } },
          right: { style: 'thin', color: { argb: 'FF9CA3AF' } },
        };
        cell.alignment = {
          vertical: 'middle',
          horizontal: columnNumber === 2 ? 'right' : 'left',
        };
      });
    }
  }

  private number(value: Decimal | null): number {
    return Number((value ?? new Decimal(0)).toFixed(2));
  }
}
