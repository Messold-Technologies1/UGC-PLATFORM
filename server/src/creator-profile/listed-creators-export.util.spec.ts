import {
  buildCreatorsContactCsv,
  buildCreatorsContactXlsx,
  buildCreatorsOutreachCsv,
  buildCreatorsOutreachXlsx,
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

  it('builds a real xlsx buffer (ZIP/OOXML signature)', async () => {
    const buffer = await buildCreatorsContactXlsx([
      { name: 'A & B', phone: null, instagram: 'https://instagram.com/ab' },
    ]);
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.byteLength).toBeGreaterThan(100);
    // .xlsx files are ZIP archives → start with PK
    expect(buffer.subarray(0, 2).toString('utf8')).toBe('PK');
  });

  it('builds outreach CSV with Name/Email/Phone and yes/no flags', () => {
    const csv = buildCreatorsOutreachCsv([
      {
        name: 'Riya',
        email: 'riya@example.com',
        phone: '+919876543210',
        instagramConnected: 'no',
        identityComplete: 'yes',
      },
    ]);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain(
      'Name,Email,Phone,instagramConnected,identityComplete',
    );
    expect(csv).toContain('Riya,riya@example.com,+919876543210,no,yes');
  });

  it('builds a real outreach xlsx buffer', async () => {
    const buffer = await buildCreatorsOutreachXlsx([
      {
        name: 'A & B',
        email: 'a@b.com',
        phone: null,
        instagramConnected: 'yes',
        identityComplete: 'no',
      },
    ]);
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.byteLength).toBeGreaterThan(100);
    expect(buffer.subarray(0, 2).toString('utf8')).toBe('PK');
  });
});
