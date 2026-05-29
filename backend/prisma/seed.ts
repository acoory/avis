import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import {
  ManufacturerRepairRuleStatus,
  PrismaClient,
  Role,
} from './generated/client.cjs';

const connectionString =
  process.env.DATABASE_URL ??
  'postgresql://postgres:postgres@localhost:5432/vehicle_control?schema=public';

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({ adapter });

type RepairRuleSeed = {
  code: string;
  status: ManufacturerRepairRuleStatus;
  mandatory?: boolean;
  thresholdAmount?: string;
  customInternalCost?: string | null;
};

function repairRuleComment(
  repairTypeName: string,
  manufacturerName: string,
  status: ManufacturerRepairRuleStatus,
) {
  const messages: Record<ManufacturerRepairRuleStatus, string> = {
    [ManufacturerRepairRuleStatus.ALLOWED]: `${repairTypeName} autorisé pour ${manufacturerName}.`,
    [ManufacturerRepairRuleStatus.FORBIDDEN]: `${repairTypeName} interdit pour ${manufacturerName}.`,
    [ManufacturerRepairRuleStatus.TO_CHECK]: `${repairTypeName} à vérifier pour ${manufacturerName}.`,
    [ManufacturerRepairRuleStatus.MANDATORY]: `${repairTypeName} obligatoire pour ${manufacturerName}.`,
    [ManufacturerRepairRuleStatus.CONDITIONAL]: `${repairTypeName} autorisé sous condition pour ${manufacturerName}.`,
  };

  return messages[status];
}

async function main() {
  const adminPassword = await bcrypt.hash('test1234', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'iprod5@live.fr' },
    update: {
      role: Role.ADMIN,
      isActive: true,
    },
    create: {
      email: 'iprod5@live.fr',
      password: adminPassword,
      firstName: 'Anthony',
      lastName: 'Cory',
      role: Role.ADMIN,
    },
  });

  await prisma.agency.createMany({
    data: [
      { name: 'Agence Marseille', city: 'Marseille' },
      { name: 'Agence Paris', city: 'Paris' },
      { name: 'Agence Lyon', city: 'Lyon' },
      { name: 'Agence Lille', city: 'Lille' },
    ],
    skipDuplicates: true,
  });

  const repairTypes = [
    {
      code: 'LUGGAGE_COVER',
      name: 'Cache bagages',
      defaultInternalSavingAmount: '400',
      defaultInternalCost: '0',
    },
    {
      code: 'SERVICING',
      name: 'Servicing',
      defaultInternalSavingAmount: '70',
      defaultInternalCost: '0',
    },
    {
      code: 'TIRE',
      name: 'Pneu',
      defaultInternalSavingAmount: '40',
      defaultInternalCost: '0',
    },
    {
      code: 'RIM',
      name: 'Jante',
      defaultInternalSavingAmount: '20',
      defaultInternalCost: '0',
    },
    {
      code: 'UPHOLSTERY',
      name: 'Sellerie',
      defaultInternalSavingAmount: '300',
      defaultInternalCost: '0',
    },
    {
      code: 'OPTIC',
      name: 'Optique',
      defaultInternalSavingAmount: '800',
      defaultInternalCost: '0',
    },
    {
      code: 'BODYWORK',
      name: 'Carrosserie',
      defaultInternalSavingAmount: '60',
      defaultInternalCost: '0',
    },
    {
      code: 'CABLE',
      name: 'Cable',
      defaultInternalSavingAmount: '400',
      defaultInternalCost: '0',
    },
    {
      code: 'DENT_REMOVAL',
      name: 'Debosselage',
      defaultInternalSavingAmount: '0',
      defaultInternalCost: '60',
    },
    {
      code: 'WINDSHIELD_REPAIR',
      name: 'Pare-brise reparation',
      defaultInternalSavingAmount: '0',
      defaultInternalCost: '0',
    },
    {
      code: 'WINDSHIELD_REPLACEMENT',
      name: 'Pare-brise remplacement',
      defaultInternalSavingAmount: '0',
      defaultInternalCost: '0',
    },
    {
      code: 'REVISION',
      name: 'Revision',
      defaultInternalSavingAmount: '0',
      defaultInternalCost: '250',
    },
  ];

  for (const repairType of repairTypes) {
    await prisma.repairType.upsert({
      where: { code: repairType.code },
      update: {
        name: repairType.name,
        defaultInternalSavingAmount: repairType.defaultInternalSavingAmount,
        defaultInternalCost: repairType.defaultInternalCost,
        isActive: true,
      },
      create: {
        ...repairType,
        isActive: true,
      },
    });
  }

  const manufacturers = [
    {
      name: 'BMW',
      allowance: '375',
      laborRate: '50',
      paintRate: '25',
      partsDiscountRate: '25',
      dentRemovalCost: '60',
      servicingCost: '250',
      revisionRequired: true,
      forbiddenDentRemoval: false,
      notes: 'Buy Back BMW/MINI : revisions imperatives, debosselage autorise.',
      models: ['Serie 1', 'Serie 3', 'X1', 'X3', 'MINI Cooper'],
    },
    {
      name: 'MINI',
      allowance: '375',
      laborRate: '50',
      paintRate: '25',
      partsDiscountRate: '25',
      dentRemovalCost: '60',
      servicingCost: '250',
      revisionRequired: true,
      forbiddenDentRemoval: false,
      notes: 'Buy Back BMW/MINI : revisions imperatives, debosselage autorise.',
      models: ['Cooper', 'Countryman', 'Clubman'],
    },
    {
      name: 'Citroen',
      allowance: '330',
      laborRate: '48',
      paintRate: '25',
      partsDiscountRate: '23',
      dentRemovalCost: '46',
      servicingCost: '105',
      revisionRequired: false,
      forbiddenDentRemoval: false,
      notes: 'Regles Buy Back Citroen : controle seuil selon montant facture.',
      models: ['C3', 'C4', 'C5 Aircross', 'Berlingo'],
    },
    {
      name: 'Fiat',
      allowance: '330',
      laborRate: '48',
      paintRate: '25',
      partsDiscountRate: '23',
      dentRemovalCost: '46',
      servicingCost: '105',
      revisionRequired: true,
      forbiddenDentRemoval: false,
      notes: 'Regles Buy Back Fiat/Alfa/Jeep : revisions imperatives.',
      models: ['500', 'Panda', 'Tipo'],
    },
    {
      name: 'Alfa Romeo',
      allowance: '330',
      laborRate: '48',
      paintRate: '25',
      partsDiscountRate: '23',
      dentRemovalCost: '46',
      servicingCost: '105',
      revisionRequired: true,
      forbiddenDentRemoval: false,
      notes: 'Regles Buy Back Fiat/Alfa/Jeep : revisions imperatives.',
      models: ['Giulia', 'Stelvio', 'Tonale'],
    },
    {
      name: 'Jeep',
      allowance: '330',
      laborRate: '48',
      paintRate: '25',
      partsDiscountRate: '23',
      dentRemovalCost: '46',
      servicingCost: '105',
      revisionRequired: true,
      forbiddenDentRemoval: false,
      notes: 'Regles Buy Back Fiat/Alfa/Jeep : revisions imperatives.',
      models: ['Renegade', 'Compass', 'Avenger'],
    },
    {
      name: 'Ford',
      allowance: '175',
      laborRate: '43',
      paintRate: '21',
      partsDiscountRate: '20',
      dentRemovalCost: null,
      servicingCost: '90',
      revisionRequired: false,
      forbiddenDentRemoval: true,
      notes: 'Franchises variables selon Fiesta, S-Max, Galaxy, Mondeo, Max et Tourneo.',
      models: ['Fiesta', 'Focus', 'Puma', 'Kuga', 'Tourneo'],
    },
    {
      name: 'Mercedes',
      allowance: '250',
      laborRate: '50',
      paintRate: '27',
      partsDiscountRate: '25',
      dentRemovalCost: '60',
      servicingCost: '250',
      revisionRequired: true,
      forbiddenDentRemoval: false,
      notes: 'Certaines reparations doivent etre verifiees selon seuil et montant facture.',
      models: ['Classe A', 'Classe C', 'GLA', 'GLC'],
    },
    {
      name: 'Nissan',
      allowance: '250',
      laborRate: '44',
      paintRate: '21.5',
      partsDiscountRate: '25',
      dentRemovalCost: '45',
      servicingCost: '150',
      revisionRequired: true,
      forbiddenDentRemoval: false,
      notes: 'Remises variables selon jantes, carrosserie, pneus et vitrage.',
      models: ['Micra', 'Juke', 'Qashqai', 'X-Trail'],
    },
    {
      name: 'Opel',
      allowance: '330',
      laborRate: '48',
      paintRate: '25',
      partsDiscountRate: '20',
      dentRemovalCost: '46',
      servicingCost: '150',
      revisionRequired: true,
      forbiddenDentRemoval: false,
      notes: 'Regles Buy Back Opel : revisions imperatives.',
      models: ['Corsa', 'Astra', 'Mokka', 'Grandland'],
    },
    {
      name: 'Volkswagen',
      allowance: '220',
      laborRate: '54',
      paintRate: '22',
      partsDiscountRate: '20',
      dentRemovalCost: null,
      servicingCost: '250',
      revisionRequired: false,
      forbiddenDentRemoval: true,
      notes: 'Debosselage non accepte au CDC. Controle seuil requis.',
      models: ['Golf', 'Polo', 'Tiguan', 'Passat'],
    },
    {
      name: 'Skoda',
      allowance: '220',
      laborRate: '54',
      paintRate: '22',
      partsDiscountRate: '20',
      dentRemovalCost: null,
      servicingCost: '250',
      revisionRequired: false,
      forbiddenDentRemoval: true,
      notes: 'Regles Volkswagen/Skoda/Seat : debosselage non accepte au CDC.',
      models: ['Fabia', 'Octavia', 'Karoq', 'Kodiaq'],
    },
    {
      name: 'Seat',
      allowance: '220',
      laborRate: '54',
      paintRate: '22',
      partsDiscountRate: '20',
      dentRemovalCost: null,
      servicingCost: '250',
      revisionRequired: false,
      forbiddenDentRemoval: true,
      notes: 'Regles Volkswagen/Skoda/Seat : debosselage non accepte au CDC.',
      models: ['Ibiza', 'Leon', 'Ateca', 'Arona'],
    },
    {
      name: 'Peugeot',
      allowance: '330',
      laborRate: '48',
      paintRate: '25',
      partsDiscountRate: '23',
      dentRemovalCost: '46',
      servicingCost: '105',
      revisionRequired: true,
      forbiddenDentRemoval: false,
      notes: 'Remise pieces specifique hors pneus.',
      models: ['208', '308', '3008', '5008'],
    },
    {
      name: 'Renault',
      allowance: '300',
      laborRate: '51',
      paintRate: '25',
      partsDiscountRate: '25',
      dentRemovalCost: '34',
      servicingCost: null,
      revisionRequired: false,
      forbiddenDentRemoval: false,
      notes: 'Regles applicables Renault & Dacia.',
      models: ['Clio', 'Captur', 'Megane', 'Austral'],
    },
    {
      name: 'Dacia',
      allowance: '300',
      laborRate: '51',
      paintRate: '25',
      partsDiscountRate: '25',
      dentRemovalCost: '34',
      servicingCost: null,
      revisionRequired: false,
      forbiddenDentRemoval: false,
      notes: 'Regles applicables Renault & Dacia.',
      models: ['Sandero', 'Duster', 'Jogger', 'Spring'],
    },
    {
      name: 'Toyota',
      allowance: '240',
      laborRate: '50',
      paintRate: '25',
      partsDiscountRate: '20',
      dentRemovalCost: '50',
      servicingCost: '200',
      revisionRequired: true,
      forbiddenDentRemoval: false,
      notes: 'Toyota/Lexus : revisions imperatives, franchises variables selon modele.',
      models: ['Yaris', 'Corolla', 'RAV4', 'C-HR'],
    },
    {
      name: 'Lexus',
      allowance: '350',
      laborRate: '50',
      paintRate: '25',
      partsDiscountRate: '20',
      dentRemovalCost: '50',
      servicingCost: '200',
      revisionRequired: true,
      forbiddenDentRemoval: false,
      notes: 'Toyota/Lexus : revisions imperatives, franchises variables selon modele.',
      models: ['UX', 'NX', 'RX', 'ES'],
    },
    {
      name: 'Volvo',
      allowance: '600',
      laborRate: '47',
      paintRate: '28',
      partsDiscountRate: '20',
      dentRemovalCost: '60',
      servicingCost: '250',
      revisionRequired: false,
      forbiddenDentRemoval: false,
      notes: 'Regles Buy Back Volvo : seuils selon pneus, vitrage et interieur.',
      models: ['XC40', 'XC60', 'XC90', 'V60'],
    },
    {
      name: 'Mercedes VU',
      allowance: '500',
      laborRate: '70',
      paintRate: '30',
      partsDiscountRate: '20',
      dentRemovalCost: '75',
      servicingCost: '250',
      revisionRequired: false,
      forbiddenDentRemoval: true,
      notes: 'Regles Mercedes VU : attention structure, chassis et cabines.',
      models: ['Vito', 'Sprinter', 'Classe V'],
    },
    {
      name: 'Iveco',
      allowance: '300',
      laborRate: '46.5',
      paintRate: '20',
      partsDiscountRate: '20',
      dentRemovalCost: null,
      servicingCost: '250',
      revisionRequired: false,
      forbiddenDentRemoval: true,
      notes: 'Regles Buy Back Iveco : debosselage non valorise.',
      models: ['Daily'],
    },
    {
      name: 'Hyundai',
      allowance: '240',
      laborRate: '50',
      paintRate: '25',
      partsDiscountRate: '20',
      dentRemovalCost: '50',
      servicingCost: '200',
      revisionRequired: false,
      forbiddenDentRemoval: false,
      notes: 'Regles Buy Back Hyundai : attention vehicule touche dans sa structure.',
      models: ['i20', 'i30', 'Kona', 'Tucson'],
    },
    {
      name: 'MG',
      allowance: '300',
      laborRate: '48',
      paintRate: '22',
      partsDiscountRate: '20',
      dentRemovalCost: '40',
      servicingCost: '220',
      revisionRequired: false,
      forbiddenDentRemoval: false,
      notes: 'Regles Buy Back MG.',
      models: ['MG3', 'MG4', 'ZS', 'EHS'],
    },
  ];

  const repairTypesByCode = Object.fromEntries(
    await Promise.all(
      repairTypes.map(async (repairType) => [
        repairType.code,
        await prisma.repairType.findUniqueOrThrow({ where: { code: repairType.code } }),
      ]),
    ),
  );

  for (const manufacturerSeed of manufacturers) {
    const manufacturer = await prisma.manufacturer.upsert({
      where: { name: manufacturerSeed.name },
      update: { name: manufacturerSeed.name },
      create: { name: manufacturerSeed.name },
    });

    for (const modelName of manufacturerSeed.models) {
      await prisma.vehicleModel.upsert({
        where: {
          manufacturerId_name: {
            manufacturerId: manufacturer.id,
            name: modelName,
          },
        },
        update: { name: modelName },
        create: {
          manufacturerId: manufacturer.id,
          name: modelName,
        },
      });
    }

    await prisma.manufacturerRule.upsert({
      where: { manufacturerId: manufacturer.id },
      update: {
        constructorAllowanceAmount: manufacturerSeed.allowance,
        laborRate: manufacturerSeed.laborRate,
        paintRate: manufacturerSeed.paintRate,
        partsDiscountRate: manufacturerSeed.partsDiscountRate,
        dentRemovalCost: manufacturerSeed.dentRemovalCost,
        servicingCost: manufacturerSeed.servicingCost,
        revisionRequired: manufacturerSeed.revisionRequired,
        notes: manufacturerSeed.notes,
      },
      create: {
        manufacturerId: manufacturer.id,
        constructorAllowanceAmount: manufacturerSeed.allowance,
        laborRate: manufacturerSeed.laborRate,
        paintRate: manufacturerSeed.paintRate,
        partsDiscountRate: manufacturerSeed.partsDiscountRate,
        dentRemovalCost: manufacturerSeed.dentRemovalCost,
        servicingCost: manufacturerSeed.servicingCost,
        revisionRequired: manufacturerSeed.revisionRequired,
        notes: manufacturerSeed.notes,
      },
    });

    const defaultRepairRules: RepairRuleSeed[] = [
      { code: 'LUGGAGE_COVER', status: ManufacturerRepairRuleStatus.ALLOWED },
      { code: 'SERVICING', status: ManufacturerRepairRuleStatus.ALLOWED },
      { code: 'TIRE', status: ManufacturerRepairRuleStatus.ALLOWED },
      { code: 'RIM', status: ManufacturerRepairRuleStatus.ALLOWED },
      { code: 'UPHOLSTERY', status: ManufacturerRepairRuleStatus.ALLOWED },
      { code: 'OPTIC', status: ManufacturerRepairRuleStatus.CONDITIONAL, thresholdAmount: '300' },
      { code: 'BODYWORK', status: ManufacturerRepairRuleStatus.ALLOWED },
      { code: 'CABLE', status: ManufacturerRepairRuleStatus.ALLOWED },
      {
        code: 'DENT_REMOVAL',
        status: manufacturerSeed.forbiddenDentRemoval
          ? ManufacturerRepairRuleStatus.FORBIDDEN
          : ManufacturerRepairRuleStatus.ALLOWED,
        customInternalCost: manufacturerSeed.dentRemovalCost,
      },
      { code: 'WINDSHIELD_REPAIR', status: ManufacturerRepairRuleStatus.ALLOWED },
      { code: 'WINDSHIELD_REPLACEMENT', status: ManufacturerRepairRuleStatus.ALLOWED },
      {
        code: 'REVISION',
        status: manufacturerSeed.revisionRequired
          ? ManufacturerRepairRuleStatus.MANDATORY
          : ManufacturerRepairRuleStatus.ALLOWED,
        mandatory: manufacturerSeed.revisionRequired,
        customInternalCost: manufacturerSeed.servicingCost,
      },
    ];

    for (const rule of defaultRepairRules) {
      const repairType = repairTypesByCode[rule.code];

      await prisma.manufacturerRepairRule.upsert({
        where: {
          manufacturerId_repairTypeId: {
            manufacturerId: manufacturer.id,
            repairTypeId: repairType.id,
          },
        },
        update: {
          status: rule.status,
          allowed: rule.status !== ManufacturerRepairRuleStatus.FORBIDDEN,
          mandatory: rule.mandatory ?? rule.status === ManufacturerRepairRuleStatus.MANDATORY,
          thresholdAmount: rule.thresholdAmount ?? null,
          customInternalCost: rule.customInternalCost ?? null,
          comment: repairRuleComment(repairType.name, manufacturer.name, rule.status),
        },
        create: {
          manufacturerId: manufacturer.id,
          repairTypeId: repairType.id,
          status: rule.status,
          allowed: rule.status !== ManufacturerRepairRuleStatus.FORBIDDEN,
          mandatory: rule.mandatory ?? rule.status === ManufacturerRepairRuleStatus.MANDATORY,
          thresholdAmount: rule.thresholdAmount ?? null,
          customInternalCost: rule.customInternalCost ?? null,
          comment: repairRuleComment(repairType.name, manufacturer.name, rule.status),
        },
      });
    }
  }

  console.info(`Seed completed. Admin: ${admin.email}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
