import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { AuthenticatedUser } from '@/common/types/authenticated-user';

import { UpdateMeDto } from './dto/update-me.dto';
import { serializeUser } from './users.serializer';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @Roles('USER', 'EXPERT', 'ADMIN')
  @ApiOkResponse({ description: 'Current user profile' })
  async getMe(@CurrentUser() user: AuthenticatedUser) {
    return serializeUser(await this.usersService.findActiveById(user.id));
  }

  @Patch('me')
  @Roles('USER', 'EXPERT', 'ADMIN')
  @ApiOkResponse({ description: 'Updated current user profile' })
  async updateMe(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateMeDto) {
    return serializeUser(await this.usersService.update(user.id, dto));
  }
}
