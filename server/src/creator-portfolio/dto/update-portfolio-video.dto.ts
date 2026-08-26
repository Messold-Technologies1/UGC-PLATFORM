import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PortfolioActingCreatorDto } from './portfolio-acting-creator.dto';

export class UpdatePortfolioVideoDto extends PortfolioActingCreatorDto {
  @ApiPropertyOptional({
    example: 'creator-portfolio/<creatorId>/videos/<uuid>.mp4',
    description:
      'Replacement video: S3 object key of an already-uploaded file. Send this to swap the ' +
      'clip while keeping the same portfolio entry — the only way to change a video once the ' +
      'portfolio is at the minimum-videos floor, where deleting is refused.',
  })
  @IsOptional()
  @IsString()
  videoKey?: string;

  @ApiPropertyOptional({
    example: 'creator-portfolio/<creatorId>/thumbnails/<uuid>.jpg',
    description:
      'Thumbnail for the replacement video. When videoKey is sent without this, the existing ' +
      'thumbnail is cleared rather than kept — it belongs to the outgoing clip.',
  })
  @IsOptional()
  @IsString()
  thumbnailKey?: string;

  @ApiPropertyOptional({
    example: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    description:
      'SHA-256 hex of the replacement video, as sent to the presign call. Recorded against ' +
      "the row so the replacement can't later be re-added as a duplicate, and so this row " +
      'stops being checked against its old file. Omit when the client could not hash the ' +
      'file (e.g. it exceeds the hashing size cap) — the stored hash is then cleared rather ' +
      'than left pointing at the outgoing clip.',
  })
  @IsOptional()
  @IsString()
  contentHash?: string;
}
