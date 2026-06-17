import { Injectable } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/client';
import ExcelJS from 'exceljs';
import { Prisma, Role, VehicleCheckItemOperationalStatus } from '../../prisma/generated/client.cjs';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { formatLicensePlate } from '../common/utils/license-plate';
import { PrismaService } from '../prisma/prisma.service';
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

@Injectable()
export class ExportsService {
  constructor(private readonly prisma: PrismaService) {}

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
    workbook.creator = 'Vehicle Control';
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
      { header: 'Economie réalisée', key: 'totalInternalSavingAmount', width: 18 },
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
        const currentQuantity = quantitiesByRepairCode.get(item.repairType.code) ?? 0;
        quantitiesByRepairCode.set(item.repairType.code, currentQuantity + item.quantity);
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
        row[`repair_${repairType.code}`] = quantitiesByRepairCode.get(repairType.code) ?? '';
      }

      worksheet.addRow(row);
    }

    this.styleSummaryBody(worksheet, columns.length, fixedColumns.length, repairColumns.length);

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
        OR: [{ collaboratorId: user.sub }, { collaborator: { managerId: user.sub } }],
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
    const positionByCode = new Map(preferredRepairTypeCodes.map((code, index) => [code, index]));

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
    header.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
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
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      });
    });

    worksheet.getColumn('checkDate').numFmt = 'dd/mm/yyyy';
    worksheet.getColumn('totalInternalSavingAmount').numFmt = '#,##0.00 €';

    for (let rowNumber = 4; rowNumber <= Math.max(12, worksheet.rowCount); rowNumber += 1) {
      const row = worksheet.getRow(rowNumber);
      for (let columnIndex = 1; columnIndex <= columnCount; columnIndex += 1) {
        const cell = row.getCell(columnIndex);
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF9CA3AF' } },
          left: { style: 'thin', color: { argb: 'FF9CA3AF' } },
          bottom: { style: 'thin', color: { argb: 'FF9CA3AF' } },
          right: { style: 'thin', color: { argb: 'FF9CA3AF' } },
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      }
      row.height = 22;
    }

    const firstRepairColumn = fixedColumnCount + 1;
    const lastRepairColumn = fixedColumnCount + repairColumnCount;
    for (let columnIndex = firstRepairColumn; columnIndex <= lastRepairColumn; columnIndex += 1) {
      worksheet.getColumn(columnIndex).alignment = { horizontal: 'center', vertical: 'middle' };
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
    header.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: worksheet.columnCount },
    };
  }

  private styleRepairTypesWorksheet(worksheet: ExcelJS.Worksheet) {
    worksheet.getRow(1).height = 26;
    worksheet.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FF111827' } };

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

    for (let rowNumber = 3; rowNumber <= Math.max(11, worksheet.rowCount); rowNumber += 1) {
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
