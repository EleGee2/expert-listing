import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Public } from '@/common/decorators/public.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { AuthenticatedUser } from '@/common/types/authenticated-user';

import { CreateExpertDto } from './dto/create-expert.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { CreateServiceDto } from './dto/create-service.dto';
import { ListExpertsQueryDto } from './dto/list-experts-query.dto';
import { UpdateExpertDto } from './dto/update-expert.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { ExpertsService } from './experts.service';

@ApiTags('experts')
@Controller({ path: 'experts', version: '1' })
export class ExpertsController {
  constructor(private readonly expertsService: ExpertsService) {}

  @Get()
  @Public()
  @ApiOkResponse({ description: 'Search published experts' })
  list(@Query() query: ListExpertsQueryDto) {
    return this.expertsService.list(query);
  }

  @Post()
  @ApiBearerAuth()
  @Roles(UserRole.USER, UserRole.EXPERT, UserRole.ADMIN)
  @ApiCreatedResponse({ description: 'Created expert profile' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateExpertDto) {
    return this.expertsService.create(user, dto);
  }

  @Get(':id')
  @Public()
  @ApiOkResponse({ description: 'Published expert detail' })
  getById(@Param('id') id: string) {
    return this.expertsService.getById(id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @Roles(UserRole.EXPERT, UserRole.ADMIN)
  @ApiOkResponse({ description: 'Updated expert profile' })
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateExpertDto) {
    return this.expertsService.update(user, id, dto);
  }

  @Get(':id/services')
  @Public()
  @ApiOkResponse({ description: 'List expert services' })
  listServices(@Param('id') id: string) {
    return this.expertsService.listServices(id);
  }

  @Post(':id/services')
  @ApiBearerAuth()
  @Roles(UserRole.EXPERT, UserRole.ADMIN)
  @ApiCreatedResponse({ description: 'Created expert service' })
  createService(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreateServiceDto,
  ) {
    return this.expertsService.createService(user, id, dto);
  }

  @Patch(':id/services/:serviceId')
  @ApiBearerAuth()
  @Roles(UserRole.EXPERT, UserRole.ADMIN)
  @ApiOkResponse({ description: 'Updated expert service' })
  updateService(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('serviceId') serviceId: string,
    @Body() dto: UpdateServiceDto,
  ) {
    return this.expertsService.updateService(user, id, serviceId, dto);
  }

  @Get(':id/reviews')
  @Public()
  @ApiOkResponse({ description: 'List expert reviews' })
  listReviews(@Param('id') id: string) {
    return this.expertsService.listReviews(id);
  }

  @Post(':id/reviews')
  @ApiBearerAuth()
  @Roles(UserRole.USER, UserRole.EXPERT, UserRole.ADMIN)
  @ApiCreatedResponse({ description: 'Created or updated expert review' })
  createReview(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.expertsService.createReview(user, id, dto);
  }

  @Post(':id/favorite')
  @ApiBearerAuth()
  @Roles(UserRole.USER, UserRole.EXPERT, UserRole.ADMIN)
  @ApiCreatedResponse({ description: 'Added expert to favorites' })
  favorite(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.expertsService.favorite(user, id);
  }

  @Delete(':id/favorite')
  @ApiBearerAuth()
  @Roles(UserRole.USER, UserRole.EXPERT, UserRole.ADMIN)
  @ApiOkResponse({ description: 'Removed expert from favorites' })
  unfavorite(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.expertsService.unfavorite(user, id);
  }
}
