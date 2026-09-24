import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { Public } from '@/common/decorators/public.decorator';

import { HealthService } from './health.service';

@ApiTags('health')
@Public()
@Controller({ path: 'health', version: '1' })
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOkResponse({ description: 'Readiness status for API, database, and Redis' })
  check() {
    return this.healthService.check();
  }

  @Get('live')
  @ApiOkResponse({ description: 'Liveness status for process supervisors' })
  live() {
    return this.healthService.live();
  }

  @Get('ready')
  @ApiOkResponse({ description: 'Readiness status for API, database, and Redis' })
  ready() {
    return this.healthService.check();
  }
}
