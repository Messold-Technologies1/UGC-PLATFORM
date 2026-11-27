import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ReplaceScheduleDto, UpdateEventDto } from './notifications-admin.dto';

/**
 * A blank per-row template override means "use the event's default". The UI
 * sends "" for an untouched box; before this it failed @IsUUID / @Matches and
 * rejected the WHOLE schedule save, so every row reverted. These pin that a
 * blank override is normalised to null instead of 400-ing the save.
 */
describe('ReplaceScheduleDto blank overrides', () => {
  const validateRow = (row: Record<string, unknown>) => {
    const dto = plainToInstance(ReplaceScheduleDto, { rows: [row] });
    const errors = validateSync(dto as object, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    return { dto: dto, errors };
  };

  const base = {
    offsetMinutes: 4320,
    channels: ['EMAIL'],
    isActive: true,
  };

  it('accepts an empty-string template override as "use default" (null)', () => {
    const { dto, errors } = validateRow({
      ...base,
      templateOverrideId: '',
      whatsappTemplateOverride: '',
    });
    expect(errors).toHaveLength(0);
    expect(dto.rows[0].templateOverrideId).toBeNull();
    expect(dto.rows[0].whatsappTemplateOverride).toBeNull();
  });

  it('treats a whitespace-only override as blank', () => {
    const { dto, errors } = validateRow({
      ...base,
      whatsappTemplateOverride: '   ',
    });
    expect(errors).toHaveLength(0);
    expect(dto.rows[0].whatsappTemplateOverride).toBeNull();
  });

  it('keeps a real template id and a real whatsapp name', () => {
    const id = '11111111-1111-4111-8111-111111111111';
    const { dto, errors } = validateRow({
      ...base,
      templateOverrideId: id,
      whatsappTemplateOverride: 'brand_never_ordered_3d',
    });
    expect(errors).toHaveLength(0);
    expect(dto.rows[0].templateOverrideId).toBe(id);
    expect(dto.rows[0].whatsappTemplateOverride).toBe('brand_never_ordered_3d');
  });

  it('still rejects a malformed whatsapp name', () => {
    const { errors } = validateRow({
      ...base,
      whatsappTemplateOverride: 'Not A Valid Name',
    });
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('UpdateEventDto blank whatsapp name', () => {
  it('normalises an empty event-level whatsapp name to null', () => {
    const dto = plainToInstance(UpdateEventDto, { whatsappTemplateName: '' });
    const errors = validateSync(dto as object, { whitelist: true });
    expect(errors).toHaveLength(0);
    expect(dto.whatsappTemplateName).toBeNull();
  });
});
