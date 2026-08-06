import {
  buildCreatorsContactCsv,
  buildCreatorsContactExcelXml,
  escapeCsvField,
} from './listed-creators-export.util';

describe('listed-creators-export.util', () => {
  it('escapes CSV fields with commas and quotes', () => {
    expect(escapeCsvField('Acme, Co')).toBe('"Acme, Co"');
    expect(escapeCsvField('Say "hi"')).toBe('"Say ""hi"""');
    expect(escapeCsvField(null)).toBe('');
  });

  it('builds CSV with BOM and Name/Phone/Instagram columns', () => {
    const csv = buildCreatorsContactCsv([
      {
        name: 'Riya',
        phone: '+919876543210',
        instagram: 'https://instagram.com/riya',
      },
    ]);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('Name,Phone,Instagram');
    expect(csv).toContain('Riya,+919876543210,https://instagram.com/riya');
  });

  it('builds SpreadsheetML with escaped XML', () => {
    const xml = buildCreatorsContactExcelXml([
      { name: 'A & B', phone: null, instagram: '<ig>' },
    ]);
    expect(xml).toContain('Excel.Sheet');
    expect(xml).toContain('A &amp; B');
    expect(xml).toContain('&lt;ig&gt;');
  });
});
