import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { AuthenticatedUser } from '@/common/types/authenticated-user';

import { ExpertsService } from './experts.service';

@ApiTags('favorites')
@ApiBearerAuth()
@Controller({ path: 'favorites', version: '1' })
export class FavoritesController {
  constructor(private readonly expertsService: ExpertsService) {}

  @Get('me')
  @Roles(UserRole.USER, UserRole.EXPERT, UserRole.ADMIN)
  @ApiOkResponse({ description: 'Current user favorite experts' })
  listMine(@CurrentUser() user: AuthenticatedUser) {
    return this.expertsService.listMyFavorites(user);
  }
}
