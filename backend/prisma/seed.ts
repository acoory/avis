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
  comment?: string;
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
  const anthonyPassword = await bcrypt.hash('AnthonyCory123', 10);
  const laurentAdminPassword = await bcrypt.hash('LaurentMekwinski123', 10);
  const laurentManagerPassword = await bcrypt.hash('LaurentMekwinski123', 10);

  await prisma.user.upsert({
    where: { email: 'laurent.mekwinski@abg.com' },
    update: {
      role: Role.ADMIN,
      isActive: true,
    },
    create: {
      email: 'laurent.mekwinski@abg.com',
      password: laurentAdminPassword,
      firstName: 'Laurent',
      lastName: 'Mekwinski',
      role: Role.ADMIN,
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: { email: 'laurent.manager@abg.com' },
    update: {
      role: Role.MANAGER,
      isActive: true,
    },
    create: {
      email: 'laurent.manager@abg.com',
      password: laurentManagerPassword,
      firstName: 'Laurent',
      lastName: 'Mekwinski',
      role: Role.MANAGER,
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: { email: 'anthony.cory@abg.com' },
    update: {
      role: Role.COLLABORATOR,
      isActive: true,
    },
    create: {
      email: 'anthony.cory@abg.com',
      password: anthonyPassword,
      firstName: 'Anthony',
      lastName: 'Cory',
      role: Role.COLLABORATOR,
      isActive: true,
    },
  });

  await prisma.agency.createMany({
    data: [
      { name: 'Agence Marseille', city: 'Marseille' },
      { name: 'Agence Paris', city: 'Paris' },
    ],
    skipDuplicates: true,
  });

  const repairTypes = [
    {
      code: 'LUGGAGE_COVER',
      name: 'Cache bagages',
      defaultInternalSavingAmount: '400',
    },
    {
      code: 'SERVICING',
      name: 'Servicing',
      defaultInternalSavingAmount: '70',
    },
    {
      code: 'TIRE',
      name: 'Pneu',
      defaultInternalSavingAmount: '40',
    },
    {
      code: 'RIM',
      name: 'Jante',
      defaultInternalSavingAmount: '20',
    },
    {
      code: 'UPHOLSTERY',
      name: 'Sellerie',
      defaultInternalSavingAmount: '300',
    },
    {
      code: 'OPTIC',
      name: 'Optique',
      defaultInternalSavingAmount: '800',
    },
    {
      code: 'BODYWORK',
      name: 'Carrosserie',
      defaultInternalSavingAmount: '60',
    },
    {
      code: 'CABLE',
      name: 'Cable',
      defaultInternalSavingAmount: '400',
    },
    // {
    //   code: 'DENT_REMOVAL',
    //   name: 'Debosselage',
    //   defaultInternalSavingAmount: '60',
    // },
    {
      code: 'WINDSHIELD_REPAIR',
      name: 'Pare-brise reparation',
      defaultInternalSavingAmount: '0',
    },
    {
      code: 'WINDSHIELD_REPLACEMENT',
      name: 'Pare-brise remplacement',
      defaultInternalSavingAmount: '0',
    },
    // {
    //   code: 'REVISION',
    //   name: 'Revision',
    //   defaultInternalSavingAmount: '0',
    // },
  ];

  const vehicleParts = [
    { code: 'UNKNOWN', name: 'Non precise', category: 'GENERAL' },
    {
      code: 'FRONT_LEFT_SIDE_MOLDING',
      name: 'Baguette latérale avant gauche',
      category: 'BAGUETTE',
    },
    {
      code: 'FRONT_RIGHT_SIDE_MOLDING',
      name: 'Baguette latérale avant droite',
      category: 'BAGUETTE',
    },
    {
      code: 'REAR_LEFT_SIDE_MOLDING',
      name: 'Baguette latérale arrière gauche',
      category: 'BAGUETTE',
    },
    {
      code: 'REAR_RIGHT_SIDE_MOLDING',
      name: 'Baguette latérale arrière droite',
      category: 'BAGUETTE',
    },
    { code: 'FRONT_BUMPER', name: 'Pare-chocs avant', category: 'CARROSSERIE' },
    {
      code: 'REAR_BUMPER',
      name: 'Pare-chocs arrière',
      category: 'CARROSSERIE',
    },
    {
      code: 'FRONT_LEFT_DOOR',
      name: 'Porte avant gauche',
      category: 'CARROSSERIE',
    },
    {
      code: 'FRONT_RIGHT_DOOR',
      name: 'Porte avant droite',
      category: 'CARROSSERIE',
    },
    {
      code: 'REAR_LEFT_DOOR',
      name: 'Porte arrière gauche',
      category: 'CARROSSERIE',
    },
    {
      code: 'REAR_RIGHT_DOOR',
      name: 'Porte arrière droite',
      category: 'CARROSSERIE',
    },
    {
      code: 'FRONT_LEFT_FENDER',
      name: 'Aile avant gauche',
      category: 'CARROSSERIE',
    },
    {
      code: 'FRONT_RIGHT_FENDER',
      name: 'Aile avant droite',
      category: 'CARROSSERIE',
    },
    {
      code: 'REAR_LEFT_FENDER',
      name: 'Aile arrière gauche',
      category: 'CARROSSERIE',
    },
    {
      code: 'REAR_RIGHT_FENDER',
      name: 'Aile arrière droite',
      category: 'CARROSSERIE',
    },
    { code: 'HOOD', name: 'Capot', category: 'CARROSSERIE' },
    { code: 'ROOF', name: 'Toit', category: 'CARROSSERIE' },
    { code: 'TAILGATE', name: 'Hayon', category: 'CARROSSERIE' },
    { code: 'TRUNK', name: 'Coffre', category: 'CARROSSERIE' },
    {
      code: 'LEFT_MIRROR',
      name: 'Rétroviseur gauche',
      category: 'RETROVISEUR',
    },
    {
      code: 'RIGHT_MIRROR',
      name: 'Rétroviseur droit',
      category: 'RETROVISEUR',
    },
    { code: 'WINDSHIELD', name: 'Pare-brise', category: 'VITRAGE' },
    { code: 'REAR_WINDOW', name: 'Lunette arrière', category: 'VITRAGE' },
    {
      code: 'FRONT_LEFT_HEADLIGHT',
      name: 'Phare avant gauche',
      category: 'OPTIQUE',
    },
    {
      code: 'FRONT_RIGHT_HEADLIGHT',
      name: 'Phare avant droit',
      category: 'OPTIQUE',
    },
    {
      code: 'REAR_LEFT_LIGHT',
      name: 'Feu arrière gauche',
      category: 'OPTIQUE',
    },
    {
      code: 'REAR_RIGHT_LIGHT',
      name: 'Feu arrière droit',
      category: 'OPTIQUE',
    },
    { code: 'FRONT_LEFT_RIM', name: 'Jante avant gauche', category: 'JANTE' },
    { code: 'FRONT_RIGHT_RIM', name: 'Jante avant droite', category: 'JANTE' },
    { code: 'REAR_LEFT_RIM', name: 'Jante arrière gauche', category: 'JANTE' },
    { code: 'REAR_RIGHT_RIM', name: 'Jante arrière droite', category: 'JANTE' },
    { code: 'FRONT_LEFT_TIRE', name: 'Pneu avant gauche', category: 'PNEU' },
    { code: 'FRONT_RIGHT_TIRE', name: 'Pneu avant droit', category: 'PNEU' },
    { code: 'REAR_LEFT_TIRE', name: 'Pneu arrière gauche', category: 'PNEU' },
    { code: 'REAR_RIGHT_TIRE', name: 'Pneu arrière droit', category: 'PNEU' },
    { code: 'DRIVER_SEAT', name: 'Siège conducteur', category: 'SELLERIE' },
    { code: 'PASSENGER_SEAT', name: 'Siège passager', category: 'SELLERIE' },
    { code: 'REAR_BENCH', name: 'Banquette arrière', category: 'SELLERIE' },
    { code: 'LUGGAGE_COVER', name: 'Cache bagages', category: 'ACCESSOIRE' },
    { code: 'KEY', name: 'Clé', category: 'ACCESSOIRE' },
    {
      code: 'CHARGING_CABLE',
      name: 'Câble de recharge',
      category: 'ACCESSOIRE',
    },
    { code: 'WHEEL_COVER', name: 'Enjoliveur', category: 'ACCESSOIRE' },
  ];

  for (const repairType of repairTypes) {
    await prisma.repairType.upsert({
      where: { code: repairType.code },
      update: {
        name: repairType.name,
        defaultInternalSavingAmount: repairType.defaultInternalSavingAmount,
        isActive: true,
      },
      create: {
        ...repairType,
        isActive: true,
      },
    });
  }

  for (const [index, vehiclePart] of vehicleParts.entries()) {
    await prisma.vehiclePart.upsert({
      where: { code: vehiclePart.code },
      update: {
        name: vehiclePart.name,
        category: vehiclePart.category,
        displayOrder: index,
        isActive: true,
      },
      create: {
        ...vehiclePart,
        displayOrder: index,
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
      notes:
        'Franchises variables selon Fiesta, S-Max, Galaxy, Mondeo, Max et Tourneo.',
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
      notes:
        'Certaines reparations doivent etre verifiees selon seuil et montant facture.',
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
      notes:
        'Toyota/Lexus : revisions imperatives, franchises variables selon modele.',
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
      notes:
        'Toyota/Lexus : revisions imperatives, franchises variables selon modele.',
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
      notes:
        'Regles Buy Back Volvo : seuils selon pneus, vitrage et interieur.',
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
      notes:
        'Regles Buy Back Hyundai : attention vehicule touche dans sa structure.',
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
        await prisma.repairType.findUniqueOrThrow({
          where: { code: repairType.code },
        }),
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
      {
        code: 'OPTIC',
        status: ManufacturerRepairRuleStatus.CONDITIONAL,
        thresholdAmount: '300',
      },
      { code: 'BODYWORK', status: ManufacturerRepairRuleStatus.ALLOWED },
      { code: 'CABLE', status: ManufacturerRepairRuleStatus.ALLOWED },
      {
        code: 'DENT_REMOVAL',
        status: manufacturerSeed.forbiddenDentRemoval
          ? ManufacturerRepairRuleStatus.FORBIDDEN
          : ManufacturerRepairRuleStatus.ALLOWED,
        customInternalCost: manufacturerSeed.dentRemovalCost,
      },
      {
        code: 'WINDSHIELD_REPAIR',
        status: ManufacturerRepairRuleStatus.ALLOWED,
      },
      {
        code: 'WINDSHIELD_REPLACEMENT',
        status: ManufacturerRepairRuleStatus.ALLOWED,
      },
      {
        code: 'REVISION',
        status: manufacturerSeed.revisionRequired
          ? ManufacturerRepairRuleStatus.TO_CHECK
          : ManufacturerRepairRuleStatus.ALLOWED,
        mandatory: false,
        customInternalCost: manufacturerSeed.servicingCost,
        comment: manufacturerSeed.revisionRequired
          ? 'Revision conseillée si elle est à faire sur le véhicule et rentable.'
          : undefined,
      },
    ];

    for (const rule of defaultRepairRules) {
      const repairType = repairTypesByCode[rule.code];
      if (!repairType) {
        console.warn(`Skipping default manufacturer rule for missing repair type: ${rule.code}`);
        continue;
      }
      const existingRule = await prisma.manufacturerRepairRule.findFirst({
        where: {
          manufacturerId: manufacturer.id,
          repairTypeId: repairType.id,
          vehiclePartId: null,
        },
      });

      const ruleData = {
        manufacturerId: manufacturer.id,
        repairTypeId: repairType.id,
        vehiclePartId: null,
        status: rule.status,
        allowed: rule.status !== ManufacturerRepairRuleStatus.FORBIDDEN,
        mandatory:
          rule.mandatory ??
          rule.status === ManufacturerRepairRuleStatus.MANDATORY,
        thresholdAmount: rule.thresholdAmount ?? null,
        customInternalCost: rule.customInternalCost ?? null,
        comment:
          rule.comment ??
          repairRuleComment(repairType.name, manufacturer.name, rule.status),
      };

      if (existingRule) {
        await prisma.manufacturerRepairRule.update({
          where: { id: existingRule.id },
          data: {
            status: ruleData.status,
            allowed: ruleData.allowed,
            mandatory: ruleData.mandatory,
            thresholdAmount: ruleData.thresholdAmount,
            customInternalCost: ruleData.customInternalCost,
            comment: ruleData.comment,
          },
        });
      } else {
        await prisma.manufacturerRepairRule.create({
          data: ruleData,
        });
      }
    }

    const specificRules = [
      {
        repairTypeCode: 'DENT_REMOVAL',
        vehiclePartCode: 'FRONT_LEFT_SIDE_MOLDING',
        status:
          manufacturer.name === 'Volkswagen'
            ? ManufacturerRepairRuleStatus.FORBIDDEN
            : ManufacturerRepairRuleStatus.ALLOWED,
      },
      {
        repairTypeCode: 'DENT_REMOVAL',
        vehiclePartCode: 'FRONT_RIGHT_SIDE_MOLDING',
        status:
          manufacturer.name === 'Volkswagen'
            ? ManufacturerRepairRuleStatus.FORBIDDEN
            : ManufacturerRepairRuleStatus.ALLOWED,
      },
      {
        repairTypeCode: 'DENT_REMOVAL',
        vehiclePartCode: 'REAR_LEFT_SIDE_MOLDING',
        status:
          manufacturer.name === 'Volkswagen'
            ? ManufacturerRepairRuleStatus.FORBIDDEN
            : ManufacturerRepairRuleStatus.ALLOWED,
      },
      {
        repairTypeCode: 'DENT_REMOVAL',
        vehiclePartCode: 'REAR_RIGHT_SIDE_MOLDING',
        status:
          manufacturer.name === 'Volkswagen'
            ? ManufacturerRepairRuleStatus.FORBIDDEN
            : ManufacturerRepairRuleStatus.ALLOWED,
      },
      {
        repairTypeCode: 'OPTIC',
        vehiclePartCode: 'FRONT_LEFT_HEADLIGHT',
        status:
          manufacturer.name === 'Mercedes'
            ? ManufacturerRepairRuleStatus.TO_CHECK
            : ManufacturerRepairRuleStatus.ALLOWED,
      },
      {
        repairTypeCode: 'OPTIC',
        vehiclePartCode: 'FRONT_RIGHT_HEADLIGHT',
        status:
          manufacturer.name === 'Mercedes'
            ? ManufacturerRepairRuleStatus.TO_CHECK
            : ManufacturerRepairRuleStatus.ALLOWED,
      },
    ].filter((rule) => rule.status !== ManufacturerRepairRuleStatus.ALLOWED);

    for (const rule of specificRules) {
      const repairType = repairTypesByCode[rule.repairTypeCode];
      if (!repairType) {
        console.warn(`Skipping specific manufacturer rule for missing repair type: ${rule.repairTypeCode}`);
        continue;
      }
      const vehiclePart = await prisma.vehiclePart.findUniqueOrThrow({
        where: { code: rule.vehiclePartCode },
      });
      const existingRule = await prisma.manufacturerRepairRule.findFirst({
        where: {
          manufacturerId: manufacturer.id,
          repairTypeId: repairType.id,
          vehiclePartId: vehiclePart.id,
        },
      });
      const comment = repairRuleComment(
        repairType.name,
        manufacturer.name,
        rule.status,
      );

      if (existingRule) {
        await prisma.manufacturerRepairRule.update({
          where: { id: existingRule.id },
          data: {
            status: rule.status,
            allowed: rule.status !== ManufacturerRepairRuleStatus.FORBIDDEN,
            mandatory: false,
            comment,
          },
        });
      } else {
        await prisma.manufacturerRepairRule.create({
          data: {
            manufacturerId: manufacturer.id,
            repairTypeId: repairType.id,
            vehiclePartId: vehiclePart.id,
            status: rule.status,
            allowed: rule.status !== ManufacturerRepairRuleStatus.FORBIDDEN,
            mandatory: false,
            comment,
          },
        });
      }
    }
  }
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
