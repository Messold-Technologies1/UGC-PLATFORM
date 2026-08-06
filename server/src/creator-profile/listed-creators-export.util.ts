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
export function buildCreatorsContactCsv(
  rows: Array<{
    name: string;
    phone: string | null;
    instagram: string | null;
  }>,
): string {
  const header = ['Name', 'Phone', 'Instagram'];
  const lines = [
    header.map(escapeCsvField).join(','),
    ...rows.map((row) =>
      [row.name, row.phone, row.instagram].map(escapeCsvField).join(','),
    ),
  ];
  // BOM helps Excel detect UTF-8
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

/**
 * Minimal SpreadsheetML (.xls) that Excel opens without extra libraries.
 */
export function buildCreatorsContactExcelXml(
  rows: Array<{
    name: string;
    phone: string | null;
    instagram: string | null;
  }>,
): string {
  const escapeXml = (value: string | null | undefined): string =>
    (value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');

  const cell = (value: string | null | undefined) =>
    `<Cell><Data ss:Type="String">${escapeXml(value)}</Data></Cell>`;

  const headerRow = `<Row>${cell('Name')}${cell('Phone')}${cell('Instagram')}</Row>`;
  const dataRows = rows
    .map(
      (row) =>
        `<Row>${cell(row.name)}${cell(row.phone)}${cell(row.instagram)}</Row>`,
    )
    .join('');

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="Listed creators">
  <Table>
   ${headerRow}
   ${dataRows}
  </Table>
 </Worksheet>
</Workbook>
`;
}
