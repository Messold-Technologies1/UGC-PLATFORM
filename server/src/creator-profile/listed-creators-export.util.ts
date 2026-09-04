import ExcelJS from 'exceljs';

export type CreatorContactExportRow = {
  name: string;
  phone: string | null;
  instagram: string | null;
};

export type CreatorOutreachExportRow = {
  name: string;
  email: string | null;
  phone: string | null;
  instagramConnected: 'yes' | 'no';
  identityComplete: 'yes' | 'no';
};

export function yesNo(value: boolean): 'yes' | 'no' {
  return value ? 'yes' : 'no';
}

/**
 * Escape a single CSV field (RFC 4180): quote when needed; double internal quotes.
 */
export function escapeCsvField(value: string | null | undefined): string {
  const raw = value ?? '';
  if (/[",\r\n]/.test(raw)) {
    return `"${raw.replaceAll('"', '""')}"`;
  }
  return raw;
}

/**
 * Build a UTF-8 CSV string with BOM so Excel opens non-ASCII names correctly.
 */
export function buildCreatorsContactCsv(rows: CreatorContactExportRow[]): string {
  const header = ['Name', 'Phone', 'Instagram'];
  const lines = [
    header.map(escapeCsvField).join(','),
    ...rows.map((row) =>
      [row.name, row.phone, row.instagram].map(escapeCsvField).join(','),
    ),
  ];
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

/**
 * Real .xlsx workbook via ExcelJS (recognized by Excel, Slack, Google Sheets).
 */
export async function buildCreatorsContactXlsx(
  rows: CreatorContactExportRow[],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'GoCollab';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Listed creators', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  sheet.columns = [
    { header: 'Name', key: 'name', width: 28 },
    { header: 'Phone', key: 'phone', width: 18 },
    { header: 'Instagram', key: 'instagram', width: 40 },
  ];

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.commit();

  for (const row of rows) {
    sheet.addRow({
      name: row.name,
      phone: row.phone ?? '',
      instagram: row.instagram ?? '',
    });
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

export function buildCreatorsOutreachCsv(
  rows: CreatorOutreachExportRow[],
): string {
  const header = ['Name', 'Email', 'Phone', 'instagramConnected', 'identityComplete'];
  const lines = [
    header.map(escapeCsvField).join(','),
    ...rows.map((row) =>
      [
        row.name,
        row.email,
        row.phone,
        row.instagramConnected,
        row.identityComplete,
      ]
        .map(escapeCsvField)
        .join(','),
    ),
  ];
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

export async function buildCreatorsOutreachXlsx(
  rows: CreatorOutreachExportRow[],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'GoCollab';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Missing Instagram & Identity', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  sheet.columns = [
    { header: 'Name', key: 'name', width: 28 },
    { header: 'Email', key: 'email', width: 36 },
    { header: 'Phone', key: 'phone', width: 18 },
    { header: 'instagramConnected', key: 'instagramConnected', width: 20 },
    { header: 'identityComplete', key: 'identityComplete', width: 18 },
  ];

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.commit();

  for (const row of rows) {
    sheet.addRow({
      name: row.name,
      email: row.email ?? '',
      phone: row.phone ?? '',
      instagramConnected: row.instagramConnected,
      identityComplete: row.identityComplete,
    });
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
