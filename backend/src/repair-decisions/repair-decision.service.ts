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
  quantity: number;
  unitInternalSavingAmount: string;
  totalInternalSavingAmount: string;
  unitInternalCost: string;
  totalInternalCost: string;
  decisionStatus: RepairDecisionStatus;
  decisionMessage: string;
  comment?: string;
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
    message: string;
  }>;
};

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
          include: { repairType: true },
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
    const rulesByRepairTypeId = new Map(
      manufacturer.repairRules.map((rule) => [rule.repairTypeId, rule]),
    );

    const lines = items.map((item) => {
      const repairType = repairTypesById.get(item.repairTypeId);
      if (!repairType) {
        throw new NotFoundException('Repair type not found');
      }

      const repairRule = rulesByRepairTypeId.get(item.repairTypeId);
      const unitInternalSavingAmount =
        repairRule?.customInternalSavingAmount ?? repairType.defaultInternalSavingAmount;
      const unitInternalCost = repairRule?.customInternalCost ?? repairType.defaultInternalCost;
      const totalInternalSavingAmount = unitInternalSavingAmount.mul(item.quantity);
      const totalInternalCost = unitInternalCost.mul(item.quantity);
      const netSavingAmount = totalInternalSavingAmount.minus(totalInternalCost);
      const decision = this.resolveLineDecision({
        manufacturerName: manufacturer.name,
        repairTypeName: repairType.name,
        totalInternalSavingAmount,
        totalInternalCost,
        repairRule,
      });

      return {
        repairTypeId: repairType.id,
        repairTypeCode: repairType.code,
        repairTypeName: repairType.name,
        quantity: item.quantity,
        unitInternalSavingAmount: this.money(unitInternalSavingAmount),
        totalInternalSavingAmount: this.money(totalInternalSavingAmount),
        unitInternalCost: this.money(unitInternalCost),
        totalInternalCost: this.money(totalInternalCost),
        decisionStatus: decision.status,
        decisionMessage:
          decision.message ??
          `Economie estimee : ${this.money(netSavingAmount)} EUR.`,
        comment: item.comment,
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
    const allowanceDifferenceAmount = constructorAllowanceAmount.minus(totalInternalCost);
    const alerts: string[] = [];

    if (allowanceDifferenceAmount.lt(0)) {
      alerts.push('Attention, le total des couts internes depasse la franchise constructeur.');
    }

    const providedRepairTypeIds = new Set(items.map((item) => item.repairTypeId));
    const missingMandatoryRepairTypes = manufacturer.repairRules
      .filter((rule) => rule.mandatory && !providedRepairTypeIds.has(rule.repairTypeId))
      .map((rule) => ({
        repairTypeId: rule.repairType.id,
        repairTypeCode: rule.repairType.code,
        repairTypeName: rule.repairType.name,
        message: `${rule.repairType.name} obligatoire avant restitution.`,
      }));

    for (const mandatory of missingMandatoryRepairTypes) {
      alerts.push(mandatory.message);
    }

    const forbiddenCount = lines.filter((line) => line.decisionStatus === RepairDecisionStatus.FORBIDDEN).length;
    const toCheckCount = lines.filter((line) => line.decisionStatus === RepairDecisionStatus.TO_CHECK).length;
    const warningCount = lines.filter((line) => line.decisionStatus === RepairDecisionStatus.WARNING).length;
    const summaryParts = [
      `${lines.length} ligne(s) analysee(s)`,
      `${this.money(totalInternalSavingAmount)} EUR d'economie estimee`,
      `${this.money(totalInternalCost)} EUR de cout interne`,
    ];

    if (forbiddenCount) summaryParts.push(`${forbiddenCount} interdite(s)`);
    if (toCheckCount) summaryParts.push(`${toCheckCount} a verifier`);
    if (warningCount) summaryParts.push(`${warningCount} alerte(s)`);
    if (missingMandatoryRepairTypes.length) {
      summaryParts.push(`${missingMandatoryRepairTypes.length} obligatoire(s) manquante(s)`);
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
    };
  }

  private resolveLineDecision({
    manufacturerName,
    repairTypeName,
    totalInternalSavingAmount,
    totalInternalCost,
    repairRule,
  }: {
    manufacturerName: string;
    repairTypeName: string;
    totalInternalSavingAmount: Decimal;
    totalInternalCost: Decimal;
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

    if (totalInternalSavingAmount.lte(totalInternalCost)) {
      return {
        status: RepairDecisionStatus.NOT_PROFITABLE,
        message: `${repairTypeName} non rentable selon les montants internes.`,
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
}
