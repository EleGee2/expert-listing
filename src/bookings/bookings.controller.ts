import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Public } from '@/common/decorators/public.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { AuthenticatedUser } from '@/common/types/authenticated-user';

import { BookingsService } from './bookings.service';
import { CreateAvailabilitySlotDto } from './dto/create-availability-slot.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { ListBookingsQueryDto } from './dto/list-bookings-query.dto';

@ApiTags('bookings')
@Controller({ version: '1' })
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get('experts/:expertId/availability')
  @Public()
  @ApiOkResponse({ description: 'Available future slots for an expert' })
  listAvailability(@Param('expertId') expertId: string) {
    return this.bookingsService.listAvailability(expertId);
  }

  @Post('experts/:expertId/availability')
  @ApiBearerAuth()
  @Roles(UserRole.EXPERT, UserRole.ADMIN)
  @ApiCreatedResponse({ description: 'Created expert availability slot' })
  createAvailability(
    @CurrentUser() user: AuthenticatedUser,
    @Param('expertId') expertId: string,
    @Body() dto: CreateAvailabilitySlotDto,
  ) {
    return this.bookingsService.createAvailability(user, expertId, dto);
  }

  @Post('bookings')
  @ApiBearerAuth()
  @Roles(UserRole.USER, UserRole.EXPERT, UserRole.ADMIN)
  @ApiCreatedResponse({ description: 'Created pending booking and payment' })
  createBooking(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateBookingDto) {
    return this.bookingsService.createBooking(user, dto);
  }

  @Get('bookings/me')
  @ApiBearerAuth()
  @Roles(UserRole.USER, UserRole.EXPERT, UserRole.ADMIN)
  @ApiOkResponse({ description: 'Current user bookings' })
  listMine(@CurrentUser() user: AuthenticatedUser, @Query() query: ListBookingsQueryDto) {
    return this.bookingsService.listMine(user, query);
  }

  @Get('bookings/:id')
  @ApiBearerAuth()
  @Roles(UserRole.USER, UserRole.EXPERT, UserRole.ADMIN)
  @ApiOkResponse({ description: 'Booking detail' })
  getById(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.bookingsService.getById(user, id);
  }

  @Post('bookings/:id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @Roles(UserRole.USER, UserRole.EXPERT, UserRole.ADMIN)
  @ApiOkResponse({ description: 'Cancelled booking' })
  cancel(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.bookingsService.cancel(user, id);
  }

  @Post('bookings/:id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @Roles(UserRole.EXPERT, UserRole.ADMIN)
  @ApiOkResponse({ description: 'Completed confirmed booking' })
  complete(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.bookingsService.complete(user, id);
  }
}
