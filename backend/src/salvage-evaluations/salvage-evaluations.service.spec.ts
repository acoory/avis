import 'reflect-metadata';
import { isDeepStrictEqual } from 'node:util';
import ExcelJS from 'exceljs';
import { MailService } from '../mail/mail.service';
import { SalvagePurchaseChannel } from './dto/salvage-evaluation.dto';
import { SalvageEvaluationsService } from './salvage-evaluations.service';

describe('SalvageEvaluationsService', () => {
  const dto = {
    estimatedRepairDays: 12,
    kilometers: 45218,
    licenseNumber: 'AB-123-CD',
    make: 'Peugeot',
    model: '208',
    mva: '00123456',
    purchaseChannel: SalvagePurchaseChannel.RISK,
    purchaseType: 'VR3UPHNEKN1234567',
    recipientEmail: 'remarketing@example.com',
    registrationDate: '2024-05-16',
    returnDate: '2027-05-16',
  };
  const sendMail = jest.fn();
  const service = new SalvageEvaluationsService({
    sendMail,
  } as unknown as MailService);

  beforeEach(() => sendMail.mockReset());

  it('updates only the authorized inputs and preserves the cost cells', async () => {
    const template = new ExcelJS.Workbook();
    await template.xlsx.readFile('assets/salvage-evaluation-template.xlsx');
    const output = new ExcelJS.Workbook();
    await output.xlsx.load(await service.workbook(dto));
    const templateSheet = template.getWorksheet('Repair vs Scrap')!;
    const outputSheet = output.getWorksheet('Repair vs Scrap')!;

    expect(Array.from({ length: 9 }, (_, index) =>
      outputSheet.getCell(`B${index + 4}`).value,
    )).toEqual([
      'PEUGEOT',
      '208',
      '00123456',
      'AB-123-CD',
      'VR3UPHNEKN1234567',
      'Risk',
      45218,
      '16MAY24',
      '16MAY27',
    ]);
    expect(outputSheet.getCell('B15').value).toBe(12);

    for (const address of ['B13', 'B14']) {
      expect(outputSheet.getCell(address).value).toEqual(
        templateSheet.getCell(address).value,
      );
      expect(outputSheet.getCell(address).style).toEqual(
        templateSheet.getCell(address).style,
      );
    }

    for (let row = 4; row <= 15; row += 1) {
      expect(
        isDeepStrictEqual(
          templateSheet.getCell(`B${row}`).style,
          outputSheet.getCell(`B${row}`).style,
        ),
      ).toBe(true);
    }

    for (let row = 16; row <= 19; row += 1) {
      expect(outputSheet.getCell(`B${row}`).value).toEqual(
        templateSheet.getCell(`B${row}`).value,
      );
      expect(outputSheet.getCell(`B${row}`).style).toEqual(
        templateSheet.getCell(`B${row}`).style,
      );
    }
  });

  it('sends the generated workbook as an email attachment', async () => {
    sendMail.mockResolvedValue({ messageId: 'mail-1' });

    const result = await service.send(dto);

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        attachments: [
          expect.objectContaining({
            content: expect.any(Buffer),
            filename: 'Salvage-Evaluation-AB-123-CD.xlsx',
          }),
        ],
        subject: 'Salvage Evaluation - AB-123-CD',
        to: 'remarketing@example.com',
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        filename: 'Salvage-Evaluation-AB-123-CD.xlsx',
        recipientEmail: 'remarketing@example.com',
        success: true,
      }),
    );
  });
});
