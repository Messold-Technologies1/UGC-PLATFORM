import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, ValidateNested } from 'class-validator';
import { CreatorAddOnCreateDto } from './create-creator-profile.dto';

export class AddCreatorAddOnsDto {
  @ApiProperty({ type: [CreatorAddOnCreateDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreatorAddOnCreateDto)
  addOns!: CreatorAddOnCreateDto[];
}

