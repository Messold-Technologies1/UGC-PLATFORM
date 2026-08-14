import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CreatorDemoVideosService } from './creator-demo-videos.service';
import { DemoVideoResponseDto } from './dto/demo-video-response.dto';

@ApiTags('Creator Demo Intro Videos')
@Controller('creators/demo-intro-videos')
export class DemoVideoController {
  constructor(private readonly service: CreatorDemoVideosService) {}

  @Get()
  @ApiOperation({
    summary: 'List active example intro videos for the wizard "watch a few examples" gallery',
  })
  @ApiOkResponse({ type: [DemoVideoResponseDto] })
  async list(): Promise<DemoVideoResponseDto[]> {
    return this.service.listActive();
  }
}
