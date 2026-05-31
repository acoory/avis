import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/client';
import {
  ManufacturerRepairRuleStatus,
  RepairDecisionStatus,
} from '../../prisma/generated/client.cjs';
import { PrismaService } from '../prisma/prisma.service';
import { RepairDecisionItemDto } from './dto/repair-decision-item.dto';

type DecisionLine = {
  repairTypeId: string;
  repairTypeCode: string;
  repairTypeName: string;
  vehiclePartId: string;
  vehiclePartCode: string;
  vehiclePartName: string;
  quantity: number;
  unitInternalSavingAmount: string;
  totalInternalSavingAmount: string;
  unitInternalCost: string;
  totalInternalCost: string;
  decisionStatus: RepairDecisionStatus;
  decisionMessage: string;
  comment?: string;
  partOrderRequired: boolean;
};

type DecisionResult = {
  manufacturerId: string;
  manufacturerName: string;
  constructorAllowanceAmount: string;
  totalInternalSavingAmount: string;
  totalInternalCost: string;
  allowanceDifferenceAmount: string;
  decisionSummary: string;
  alerts: string[];
  items: DecisionLine[];
  missingMandatoryRepairTypes: Array<{
    repairTypeId: string;
    repairTypeCode: string;
    repairTypeName: string;
    vehiclePartId: string | null;
    vehiclePartCode: string | null;
    vehiclePartName: string | null;
    message: string;
  }>;
  recommendedRepairTypes: Array<{
    repairTypeId: string;
    repairTypeCode: string;
    repairTypeName: string;
    vehiclePartId: string | null;
    vehiclePartCode: string | null;
    vehiclePartName: string | null;
    message: string;
  }>;
};

const repairTypeCodesWithoutVehiclePart = new Set(['SERVICING']);

@Injectable()
export class RepairDecisionService {
  constructor(private readonly prisma: PrismaService) {}

  async preview(manufacturerId: string, items: RepairDecisionItemDto[]): Promise<DecisionResult> {
    if (!items.length) {
      throw new BadRequestException('At least one repair item is required');
    }

    const manufacturer = await this.prisma.manufacturer.findUnique({
      where: { id: manufacturerId },
      include: {
        rule: true,
        repairRules: {
          include: { repairType: true, vehiclePart: true },
        },
      },
    });

    if (!manufacturer) {
      throw new NotFoundException('Manufacturer not found');
    }

    const repairTypeIds = [...new Set(items.map((item) => item.repairTypeId))];
    const repairTypes = await this.prisma.repairType.findMany({
      where: { id: { in: repairTypeIds }, isActive: true },
    });

    if (repairTypes.length !== repairTypeIds.length) {
      throw new NotFoundException('One or more repair types were not found');
    }

    const repairTypesById = new Map(repairTypes.map((repairType) => [repairType.id, repairType]));
    const unknownVehiclePart = items.some((item) => {
      const repairType = repairTypesById.get(item.repairTypeId);
      return repairType && !item.vehiclePartId && this.isVehiclePartOptional(repairType.code);
    })
      ? await this.ensureUnknownVehiclePart()
      : null;
    const vehiclePartIds = [
      ...new Set(
        items
          .map((item) => item.vehiclePartId)
          .filter((vehiclePartId): vehiclePartId is string => Boolean(vehiclePartId)),
      ),
    ];
    const vehicleParts = await this.prisma.vehiclePart.findMany({
      where: {
        id: {
          in: unknownVehiclePart ? [...vehiclePartIds, unknownVehiclePart.id] : vehiclePartIds,
        },
        isActive: true,
      },
    });

    if (vehicleParts.length !== vehiclePartIds.length + (unknownVehiclePart ? 1 : 0)) {
      throw new NotFoundException('One or more vehicle parts were not found');
    }

    const vehiclePartsById = new Map(vehicleParts.map((vehiclePart) => [vehiclePart.id, vehiclePart]));
    const normalizedItems = items.map((item) => {
      const repairType = repairTypesById.get(item.repairTypeId);
      if (!repairType) {
        throw new NotFoundException('Repair type not found');
      }

      if (item.vehiclePartId) {
        return {
          ...item,
          repairType,
          vehiclePartId: item.vehiclePartId,
        };
      }

      if (this.isVehiclePartOptional(repairType.code) && unknownVehiclePart) {
        return {
          ...item,
          repairType,
          vehiclePartId: unknownVehiclePart.id,
        };
      }

      throw new BadRequestException(`Vehicle part is required for ${repairType.name}`);
    });
    const rulesByRepairTypeAndPartId = new Map(
      manufacturer.repairRules.map((rule) => [this.ruleKey(rule.repairTypeId, rule.vehiclePartId), rule]),
    );

    const lines = normalizedItems.map((item) => {
      const repairType = item.repairType;
      const vehiclePart = vehiclePartsById.get(item.vehiclePartId);
      if (!vehiclePart) {
        throw new NotFoundException('Vehicle part not found');
      }

      const repairRule =
        rulesByRepairTypeAndPartId.get(this.ruleKey(item.repairTypeId, item.vehiclePartId)) ??
        rulesByRepairTypeAndPartId.get(this.ruleKey(item.repairTypeId, null));
      const unitInternalSavingAmount =
        repairRule?.customInternalSavingAmount ?? repairType.defaultInternalSavingAmount;
      const unitInternalCost = new Decimal(0);
      const totalInternalSavingAmount = unitInternalSavingAmount.mul(item.quantity);
      const totalInternalCost = unitInternalCost.mul(item.quantity);
      const decision = this.resolveLineDecision({
        manufacturerName: manufacturer.name,
        repairTypeName: repairType.name,
        totalInternalSavingAmount,
        repairRule,
      });

      return {
        repairTypeId: repairType.id,
        repairTypeCode: repairType.code,
        repairTypeName: repairType.name,
        vehiclePartId: vehiclePart.id,
        vehiclePartCode: vehiclePart.code,
        vehiclePartName: vehiclePart.name,
        quantity: item.quantity,
        unitInternalSavingAmount: this.money(unitInternalSavingAmount),
        totalInternalSavingAmount: this.money(totalInternalSavingAmount),
        unitInternalCost: this.money(unitInternalCost),
        totalInternalCost: this.money(totalInternalCost),
        decisionStatus: decision.status,
        decisionMessage:
          decision.message ??
          `Economie reference : ${this.money(totalInternalSavingAmount)} EUR.`,
        comment: item.comment,
        partOrderRequired: item.partOrderRequired ?? false,
      } satisfies DecisionLine;
    });

    const totalInternalSavingAmount = lines.reduce(
      (sum, line) => sum.plus(line.totalInternalSavingAmount),
      new Decimal(0),
    );
    const totalInternalCost = lines.reduce(
      (sum, line) => sum.plus(line.totalInternalCost),
      new Decimal(0),
    );
    const constructorAllowanceAmount = manufacturer.rule?.constructorAllowanceAmount ?? new Decimal(0);
    const allowanceDifferenceAmount = constructorAllowanceAmount;
    const alerts: string[] = [];

    const providedRepairTypeIds = new Set(normalizedItems.map((item) => item.repairTypeId));
    const providedRepairTypeAndPartIds = new Set(
      normalizedItems.map((item) => this.ruleKey(item.repairTypeId, item.vehiclePartId)),
    );
    const missingMandatoryRepairTypes = manufacturer.repairRules
      .filter(
        (rule) =>
          rule.mandatory &&
          rule.repairType.code !== 'REVISION' &&
          (rule.vehiclePartId
            ? !providedRepairTypeAndPartIds.has(this.ruleKey(rule.repairTypeId, rule.vehiclePartId))
            : !providedRepairTypeIds.has(rule.repairTypeId)),
      )
      .map((rule) => ({
        repairTypeId: rule.repairType.id,
        repairTypeCode: rule.repairType.code,
        repairTypeName: rule.repairType.name,
        vehiclePartId: rule.vehiclePart?.id ?? null,
        vehiclePartCode: rule.vehiclePart?.code ?? null,
        vehiclePartName: rule.vehiclePart?.name ?? null,
        message: rule.vehiclePart
          ? `${rule.vehiclePart.name} - ${rule.repairType.name} obligatoire avant restitution.`
          : `${rule.repairType.name} obligatoire avant restitution.`,
      }));

    for (const mandatory of missingMandatoryRepairTypes) {
      alerts.push(mandatory.message);
    }

    const recommendedRepairTypes = manufacturer.repairRules
      .filter(
        (rule) =>
          rule.repairType.code === 'REVISION' &&
          !providedRepairTypeIds.has(rule.repairTypeId) &&
          (manufacturer.rule?.revisionRequired ||
            rule.status === ManufacturerRepairRuleStatus.TO_CHECK ||
            rule.status === ManufacturerRepairRuleStatus.MANDATORY),
      )
      .map((rule) => ({
        repairTypeId: rule.repairType.id,
        repairTypeCode: rule.repairType.code,
        repairTypeName: rule.repairType.name,
        vehiclePartId: rule.vehiclePart?.id ?? null,
        vehiclePartCode: rule.vehiclePart?.code ?? null,
        vehiclePartName: rule.vehiclePart?.name ?? null,
        message:
          rule.comment ??
          'Revision conseillée si elle est à faire sur le véhicule et rentable.',
      }));

    const forbiddenCount = lines.filter((line) => line.decisionStatus === RepairDecisionStatus.FORBIDDEN).length;
    const toCheckCount = lines.filter((line) => line.decisionStatus === RepairDecisionStatus.TO_CHECK).length;
    const warningCount = lines.filter((line) => line.decisionStatus === RepairDecisionStatus.WARNING).length;
    const summaryParts = [
      `${lines.length} ligne(s) analysee(s)`,
      `${this.money(totalInternalSavingAmount)} EUR d'economie reference`,
    ];

    if (forbiddenCount) summaryParts.push(`${forbiddenCount} interdite(s)`);
    if (toCheckCount) summaryParts.push(`${toCheckCount} a verifier`);
    if (warningCount) summaryParts.push(`${warningCount} alerte(s)`);
    if (missingMandatoryRepairTypes.length) {
      summaryParts.push(`${missingMandatoryRepairTypes.length} obligatoire(s) manquante(s)`);
    }
    if (recommendedRepairTypes.length) {
      summaryParts.push(`${recommendedRepairTypes.length} recommandation(s)`);
    }

    return {
      manufacturerId: manufacturer.id,
      manufacturerName: manufacturer.name,
      constructorAllowanceAmount: this.money(constructorAllowanceAmount),
      totalInternalSavingAmount: this.money(totalInternalSavingAmount),
      totalInternalCost: this.money(totalInternalCost),
      allowanceDifferenceAmount: this.money(allowanceDifferenceAmount),
      decisionSummary: summaryParts.join(' | '),
      alerts,
      items: lines,
      missingMandatoryRepairTypes,
      recommendedRepairTypes,
    };
  }

  private resolveLineDecision({
    manufacturerName,
    repairTypeName,
    totalInternalSavingAmount,
    repairRule,
  }: {
    manufacturerName: string;
    repairTypeName: string;
    totalInternalSavingAmount: Decimal;
    repairRule?: {
      status: ManufacturerRepairRuleStatus;
      allowed: boolean;
      mandatory: boolean;
      thresholdAmount: Decimal | null;
      thresholdPercentage: Decimal | null;
      comment: string | null;
    };
  }): { status: RepairDecisionStatus; message?: string } {
    if (repairRule?.status === ManufacturerRepairRuleStatus.FORBIDDEN || repairRule?.allowed === false) {
      return {
        status: RepairDecisionStatus.FORBIDDEN,
        message: repairRule.comment ?? `${repairTypeName} est interdite pour ${manufacturerName}.`,
      };
    }

    if (repairRule?.status === ManufacturerRepairRuleStatus.MANDATORY || repairRule?.mandatory) {
      return {
        status: RepairDecisionStatus.MANDATORY,
        message: repairRule.comment ?? `${repairTypeName} obligatoire avant restitution.`,
      };
    }

    if (repairRule?.thresholdAmount && totalInternalSavingAmount.lt(repairRule.thresholdAmount)) {
      return {
        status: RepairDecisionStatus.TO_CHECK,
        message:
          repairRule.comment ??
          `${repairTypeName} a verifier car le seuil minimum n'est pas atteint.`,
      };
    }

    if (repairRule?.status === ManufacturerRepairRuleStatus.TO_CHECK) {
      return {
        status: RepairDecisionStatus.TO_CHECK,
        message: repairRule.comment ?? `${repairTypeName} a verifier pour ${manufacturerName}.`,
      };
    }

    if (repairRule?.status === ManufacturerRepairRuleStatus.CONDITIONAL) {
      return {
        status: RepairDecisionStatus.WARNING,
        message: repairRule.comment ?? `${repairTypeName} autorisee sous condition pour ${manufacturerName}.`,
      };
    }

    return {
      status: RepairDecisionStatus.ACCEPTED,
      message: repairRule?.comment ?? `${repairTypeName} autorisee pour ${manufacturerName}.`,
    };
  }

  private money(value: Decimal | string): string {
    return new Decimal(value).toFixed(2);
  }

  private isVehiclePartOptional(repairTypeCode: string) {
    return repairTypeCodesWithoutVehiclePart.has(repairTypeCode);
  }

  private async ensureUnknownVehiclePart() {
    return this.prisma.vehiclePart.upsert({
      where: { code: 'UNKNOWN' },
      update: { isActive: true },
      create: {
        code: 'UNKNOWN',
        name: 'Non precise',
        category: 'GENERAL',
        displayOrder: 0,
        isActive: true,
      },
    });
  }

  private ruleKey(repairTypeId: string, vehiclePartId: string | null) {
    return `${repairTypeId}:${vehiclePartId ?? 'ANY'}`;
  }
}
