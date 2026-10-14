import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { UpsertCreatorPayoutDetailsDto } from './dto/upsert-creator-payout-details.dto';

function validate(payload: Record<string, unknown>) {
  const dto = plainToInstance(UpsertCreatorPayoutDetailsDto, payload);
  const errors = validateSync(dto, { whitelist: true });
  return {
    dto,
    failedProperties: errors.map((error) => error.property),
  };
}

describe('UpsertCreatorPayoutDetailsDto', () => {
  it('accepts a full bank payload and normalizes it', () => {
    const { dto, failedProperties } = validate({
      accountHolderName: '  Jane Doe  ',
      accountNumber: ' 123456789012 ',
      ifsc: ' hdfc0001234 ',
    });

    expect(failedProperties).toEqual([]);
    expect(dto.accountHolderName).toBe('Jane Doe');
    expect(dto.accountNumber).toBe('123456789012');
    expect(dto.ifsc).toBe('HDFC0001234');
  });

  it('accepts a UPI payload and lowercases the VPA', () => {
    const { dto, failedProperties } = validate({ upiId: ' Name@OKHDFCBank ' });

    expect(failedProperties).toEqual([]);
    expect(dto.upiId).toBe('name@okhdfcbank');
  });

  it('rejects account numbers that are not 9–18 digits', () => {
    expect(validate({ accountNumber: '12345678' }).failedProperties).toEqual([
      'accountNumber',
    ]);
    expect(
      validate({ accountNumber: '1234567890123456789' }).failedProperties,
    ).toEqual(['accountNumber']);
    expect(
      validate({ accountNumber: '12345678A012' }).failedProperties,
    ).toEqual(['accountNumber']);
  });

  it('rejects malformed IFSC codes', () => {
    expect(validate({ ifsc: 'HDFC1001234' }).failedProperties).toEqual([
      'ifsc',
    ]);
    expect(validate({ ifsc: 'HD0001234' }).failedProperties).toEqual(['ifsc']);
  });

  it('rejects malformed UPI IDs', () => {
    expect(validate({ upiId: 'nobank' }).failedProperties).toEqual(['upiId']);
    expect(validate({ upiId: 'name@bank1' }).failedProperties).toEqual([
      'upiId',
    ]);
    expect(validate({ upiId: 'na me@okaxis' }).failedProperties).toEqual([
      'upiId',
    ]);
  });

  it('rejects an account holder name shorter than 3 characters', () => {
    expect(validate({ accountHolderName: 'Jo' }).failedProperties).toEqual([
      'accountHolderName',
    ]);
  });

  it('treats a blank UPI ID as "not provided" rather than invalid', () => {
    const { dto, failedProperties } = validate({ upiId: '   ' });

    expect(failedProperties).toEqual([]);
    expect(dto.upiId).toBeUndefined();
  });
});
