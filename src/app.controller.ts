import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { Public } from './common/decorators/public.decorator';

@ApiTags('app')
@Public()
@Controller({ version: VERSION_NEUTRAL })
export class AppController {
  constructor(private readonly config: ConfigService) {}

  @Get()
  @ApiOkResponse({ description: 'API metadata' })
  getRoot() {
    return {
      name: this.config.getOrThrow<string>('app.name'),
      version: '0.1.0',
      docs: '/docs',
      health: `/${this.config.getOrThrow<string>('app.apiPrefix')}/v${this.config.getOrThrow<string>('app.apiVersion')}/health`,
    };
  }
}
