import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ExportListedCreatorsQueryDto {
  @ApiPropertyOptional({
    enum: ['csv', 'xls'],
    default: 'csv',
    description:
      'csv = UTF-8 CSV (opens in Excel). xls = SpreadsheetML Excel file.',
  })
  @IsOptional()
  @IsIn(['csv', 'xls'])
  format?: 'csv' | 'xls';

  @ApiPropertyOptional({
    description: 'Optional name/phone/instagram search (same as admin list)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;
}
