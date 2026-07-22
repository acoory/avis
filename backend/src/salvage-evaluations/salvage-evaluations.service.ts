import { Injectable, InternalServerErrorException } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { join } from 'node:path';
import { MailService } from '../mail/mail.service';
import { SalvageEvaluationDto } from './dto/salvage-evaluation.dto';

const EXCEL_CONTENT_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const TEMPLATE_FILENAME = 'salvage-evaluation-template.xlsx';

@Injectable()
export class SalvageEvaluationsService {
  constructor(private readonly mailService: MailService) {}

  async workbook(dto: SalvageEvaluationDto): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(this.templatePath());
    const worksheet = workbook.getWorksheet('Repair vs Scrap');

    if (!worksheet) {
      throw new InternalServerErrorException(
        'Salvage Evaluation template is invalid',
      );
    }

    const orangeCellValues: Array<[string, ExcelJS.CellValue]> = [
      ['B4', dto.make.trim().toUpperCase()],
      ['B5', dto.model.trim().toUpperCase()],
      ['B6', this.identifierValue(dto.mva)],
      ['B7', dto.licenseNumber.trim().toUpperCase()],
      ['B8', dto.purchaseType.trim().toUpperCase()],
      ['B9', dto.purchaseChannel],
      ['B10', dto.kilometers],
      ['B11', this.templateDate(dto.registrationDate)],
      ['B12', this.templateDate(dto.returnDate)],
      ['B15', dto.estimatedRepairDays],
    ];

    for (const [cellAddress, value] of orangeCellValues) {
      worksheet.getCell(cellAddress).value = value;
    }

    const output = await workbook.xlsx.writeBuffer();
    return Buffer.from(output);
  }

  filename(dto: SalvageEvaluationDto) {
    const licenseNumber = dto.licenseNumber
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9-]+/g, '-');
    return `Salvage-Evaluation-${licenseNumber || 'vehicule'}.xlsx`;
  }

  async send(dto: SalvageEvaluationDto) {
    const workbook = await this.workbook(dto);
    const filename = this.filename(dto);
    const vehicle = `${dto.make.trim()} ${dto.model.trim()}`.trim();
    const licenseNumber = dto.licenseNumber.trim().toUpperCase();

    await this.mailService.sendMail({
      attachments: [
        {
          content: workbook,
          contentType: EXCEL_CONTENT_TYPE,
          filename,
        },
      ],
      html: this.emailHtml(dto, vehicle, licenseNumber),
      subject: `Salvage Evaluation - ${licenseNumber}`,
      text: this.emailText(dto, vehicle, licenseNumber),
      to: dto.recipientEmail.trim(),
    });

    return {
      filename,
      recipientEmail: dto.recipientEmail.trim(),
      sentAt: new Date().toISOString(),
      success: true,
    };
  }

  private templatePath() {
    return join(process.cwd(), 'assets', TEMPLATE_FILENAME);
  }

  private identifierValue(value: string): string | number {
    const trimmed = value.trim();
    return /^\d+$/.test(trimmed) && !trimmed.startsWith('0')
      ? Number(trimmed)
      : trimmed.toUpperCase();
  }

  private templateDate(value: string) {
    const [year, month, day] = value.split('-').map(Number);
    const months = [
      'JAN',
      'FEB',
      'MAR',
      'APR',
      'MAY',
      'JUN',
      'JUL',
      'AUG',
      'SEP',
      'OCT',
      'NOV',
      'DEC',
    ];
    return `${String(day).padStart(2, '0')}${months[month - 1]}${String(year).slice(-2)}`;
  }

  private emailText(
    dto: SalvageEvaluationDto,
    vehicle: string,
    licenseNumber: string,
  ) {
    return [
      'Bonjour,',
      '',
      'Veuillez trouver en pièce jointe le document Salvage Evaluation complété.',
      '',
      `Véhicule : ${vehicle}`,
      `Immatriculation : ${licenseNumber}`,
      `Kilométrage : ${dto.kilometers.toLocaleString('fr-FR')} km`,
      `Durée estimée : ${dto.estimatedRepairDays} jour(s)`,
      '',
      'Cordialement,',
      'Vehicle Control',
    ].join('\n');
  }

  private emailHtml(
    dto: SalvageEvaluationDto,
    vehicle: string,
    licenseNumber: string,
  ) {
    const rows = [
      ['Véhicule', vehicle],
      ['Immatriculation', licenseNumber],
      ['Kilométrage', `${dto.kilometers.toLocaleString('fr-FR')} km`],
      ['Durée estimée', `${dto.estimatedRepairDays} jour(s)`],
    ];

    return `
      <div style="font-family:Arial,sans-serif;color:#111827;line-height:1.5">
        <p>Bonjour,</p>
        <p>Veuillez trouver en pièce jointe le document <strong>Salvage Evaluation</strong> complété.</p>
        <table style="border-collapse:collapse;margin:20px 0;min-width:420px">
          ${rows
            .map(
              ([label, value]) => `
                <tr>
                  <td style="border:1px solid #d1d5db;background:#f3f4f6;padding:8px 12px;font-weight:600">${this.escapeHtml(label)}</td>
                  <td style="border:1px solid #d1d5db;padding:8px 12px">${this.escapeHtml(value)}</td>
                </tr>`,
            )
            .join('')}
        </table>
        <p>Cordialement,<br>Vehicle Control</p>
      </div>`;
  }

  private escapeHtml(value: string) {
    return value.replace(/[&<>"']/g, (character) => {
      const entities: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
      };
      return entities[character];
    });
  }
}
