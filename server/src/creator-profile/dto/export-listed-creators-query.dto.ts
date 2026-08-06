import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ExportListedCreatorsQueryDto {
  @ApiPropertyOptional({
    enum: ['xlsx', 'csv'],
    default: 'xlsx',
    description:
      'xlsx = real Excel workbook (ExcelJS). csv = UTF-8 CSV. Legacy `xls` is accepted and treated as xlsx.',
  })
  @IsOptional()
  @IsIn(['xlsx', 'csv', 'xls'])
  format?: 'xlsx' | 'csv' | 'xls';

  @ApiPropertyOptional({
    description: 'Optional name/phone/instagram search (same as admin list)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;
}
