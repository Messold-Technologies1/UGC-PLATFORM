import { isSuperAdminEmail } from './super-admin';

describe('isSuperAdminEmail', () => {
  it('allows the two designated admins', () => {
    expect(isSuperAdminEmail('anuj@messold.com')).toBe(true);
    expect(isSuperAdminEmail('bipasha.roy@messold.com')).toBe(true);
  });

  it('is case-insensitive and trims whitespace', () => {
    expect(isSuperAdminEmail('  Anuj@Messold.com  ')).toBe(true);
    expect(isSuperAdminEmail('Bipasha.Roy@MESSOLD.COM')).toBe(true);
  });

  it('rejects other emails', () => {
    expect(isSuperAdminEmail('other.admin@messold.com')).toBe(false);
    expect(isSuperAdminEmail('')).toBe(false);
    expect(isSuperAdminEmail(null)).toBe(false);
    expect(isSuperAdminEmail(undefined)).toBe(false);
  });
});
