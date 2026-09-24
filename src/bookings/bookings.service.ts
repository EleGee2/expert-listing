import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { BookingStatus, ExpertStatus, PaymentProvider, PaymentStatus, Prisma, UserRole } from '@prisma/client';

import { AuthenticatedUser } from '@/common/types/authenticated-user';
import { buildPaginationMeta, getPagination } from '@/common/utils/pagination';
import { PrismaService } from '@/database/prisma.service';
import { MockPaymentProvider } from '@/payments/mock-payment.provider';

import { serializeAvailabilitySlot, serializeBooking } from './bookings.serializer';
import { CreateAvailabilitySlotDto } from './dto/create-availability-slot.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { ListBookingsQueryDto } from './dto/list-bookings-query.dto';

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentProvider: MockPaymentProvider,
  ) {}

  async listAvailability(expertId: string) {
    await this.assertPublishedExpert(expertId);

    const slots = await this.prisma.availabilitySlot.findMany({
      where: {
        expertId,
        isAvailable: true,
        startsAt: { gte: new Date() },
      },
      orderBy: { startsAt: 'asc' },
    });

    return slots.map(serializeAvailabilitySlot);
  }

  async createAvailability(user: AuthenticatedUser, expertId: string, dto: CreateAvailabilitySlotDto) {
    await this.assertExpertOwnerOrAdmin(user, expertId);
    this.assertValidSlot(dto.startsAt, dto.endsAt);

    const overlapping = await this.prisma.availabilitySlot.findFirst({
      where: {
        expertId,
        startsAt: { lt: dto.endsAt },
        endsAt: { gt: dto.startsAt },
      },
    });

    if (overlapping) {
      throw new BadRequestException('Availability slot overlaps an existing slot');
    }

    const slot = await this.prisma.availabilitySlot.create({
      data: {
        expertId,
        startsAt: dto.startsAt,
        endsAt: dto.endsAt,
      },
    });

    return serializeAvailabilitySlot(slot);
  }

  async createBooking(user: AuthenticatedUser, dto: CreateBookingDto) {
    const service = await this.prisma.expertService.findFirst({
      where: { id: dto.serviceId, isActive: true, deletedAt: null, expert: { status: ExpertStatus.PUBLISHED } },
      include: { expert: true },
    });

    if (!service) {
      throw new NotFoundException('Expert service not found');
    }

    if (service.expert.userId === user.id) {
      throw new ForbiddenException('You cannot book your own expert service');
    }

    const { startsAt, endsAt, availabilitySlotId } = await this.resolveBookingTime(service, dto);

    return this.prisma.$transaction(async (tx) => {
      await this.assertNoBookingOverlap(tx, service.expertId, startsAt, endsAt);

      if (availabilitySlotId) {
        const updated = await tx.availabilitySlot.updateMany({
          where: {
            id: availabilitySlotId,
            expertId: service.expertId,
            isAvailable: true,
          },
          data: { isAvailable: false },
        });

        if (updated.count !== 1) {
          throw new BadRequestException('Availability slot is no longer available');
        }
      }

      const booking = await tx.booking.create({
        data: {
          customerId: user.id,
          expertId: service.expertId,
          serviceId: service.id,
          availabilitySlotId,
          startsAt,
          endsAt,
          amountMinor: service.priceMinor,
          currency: service.currency,
          notes: dto.notes?.trim() || null,
        },
      });
      const customer = await tx.user.findUniqueOrThrow({ where: { id: user.id } });
      const initializedPayment = await this.paymentProvider.initialize({
        bookingId: booking.id,
        amountMinor: booking.amountMinor,
        currency: booking.currency,
        customerEmail: customer.email,
      });

      await tx.payment.create({
        data: {
          bookingId: booking.id,
          provider: PaymentProvider.MOCK,
          status: PaymentStatus.PENDING,
          amountMinor: booking.amountMinor,
          currency: booking.currency,
          providerReference: initializedPayment.providerReference,
          checkoutUrl: initializedPayment.checkoutUrl,
        },
      });

      const created = await tx.booking.findUniqueOrThrow({
        where: { id: booking.id },
        include: this.bookingInclude(),
      });

      return serializeBooking(created);
    });
  }

  async listMine(user: AuthenticatedUser, query: ListBookingsQueryDto) {
    const { page, limit, skip, take } = getPagination(query);
    const where: Prisma.BookingWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(user.role === UserRole.ADMIN
        ? {}
        : {
            OR: [{ customerId: user.id }, { expert: { userId: user.id } }],
          }),
    };
    const [items, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: this.bookingInclude(),
      }),
      this.prisma.booking.count({ where }),
    ]);

    return {
      items: items.map(serializeBooking),
      pagination: buildPaginationMeta(total, page, limit),
    };
  }

  async getById(user: AuthenticatedUser, bookingId: string) {
    const booking = await this.findAccessibleBooking(user, bookingId);

    return serializeBooking(booking);
  }

  async cancel(user: AuthenticatedUser, bookingId: string) {
    const booking = await this.findAccessibleBooking(user, bookingId);

    const terminalStatuses: BookingStatus[] = [BookingStatus.CANCELLED, BookingStatus.COMPLETED];

    if (terminalStatuses.includes(booking.status)) {
      throw new BadRequestException('Booking cannot be cancelled in its current status');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (booking.availabilitySlotId) {
        await tx.availabilitySlot.update({
          where: { id: booking.availabilitySlotId },
          data: { isAvailable: true },
        });
      }

      await tx.payment.updateMany({
        where: { bookingId, status: PaymentStatus.PENDING },
        data: { status: PaymentStatus.CANCELLED },
      });

      return tx.booking.update({
        where: { id: bookingId },
        data: { status: BookingStatus.CANCELLED, cancelledAt: new Date() },
        include: this.bookingInclude(),
      });
    });

    return serializeBooking(updated);
  }

  async complete(user: AuthenticatedUser, bookingId: string) {
    const booking = await this.findAccessibleBooking(user, bookingId);

    if (user.role !== UserRole.ADMIN && booking.expert?.userId !== user.id) {
      throw new ForbiddenException('Only the expert or admin can complete this booking');
    }

    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException('Only confirmed bookings can be completed');
    }

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.COMPLETED },
      include: this.bookingInclude(),
    });

    return serializeBooking(updated);
  }

  async confirmPaid(providerReference: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { providerReference },
      include: { booking: true },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status === PaymentStatus.SUCCEEDED) {
      return { message: 'Payment already confirmed', bookingId: payment.bookingId };
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.SUCCEEDED },
      });
      const booking = await tx.booking.update({
        where: { id: payment.bookingId },
        data: { status: BookingStatus.CONFIRMED },
        include: this.bookingInclude(),
      });
      await tx.outboxEvent.create({
        data: {
          topic: 'booking.confirmed',
          payload: {
            bookingId: booking.id,
            expertId: booking.expertId,
            customerId: booking.customerId,
          },
        },
      });

      return booking;
    });

    return serializeBooking(updated);
  }

  private bookingInclude() {
    return {
      customer: { select: { id: true, firstName: true, lastName: true, email: true } },
      expert: { select: { id: true, headline: true, userId: true } },
      service: { select: { id: true, title: true, durationMinutes: true } },
      payment: true,
      availabilitySlot: true,
    } satisfies Prisma.BookingInclude;
  }

  private async resolveBookingTime(
    service: { durationMinutes: number; expertId: string },
    dto: CreateBookingDto,
  ): Promise<{ startsAt: Date; endsAt: Date; availabilitySlotId?: string }> {
    if (dto.availabilitySlotId) {
      const slot = await this.prisma.availabilitySlot.findFirst({
        where: { id: dto.availabilitySlotId, expertId: service.expertId, isAvailable: true },
      });

      if (!slot) {
        throw new BadRequestException('Availability slot is not available');
      }

      return { startsAt: slot.startsAt, endsAt: slot.endsAt, availabilitySlotId: slot.id };
    }

    if (!dto.startsAt) {
      throw new BadRequestException('startsAt is required when availabilitySlotId is not provided');
    }

    const startsAt = dto.startsAt;
    const endsAt = new Date(startsAt.getTime() + service.durationMinutes * 60_000);
    this.assertValidSlot(startsAt, endsAt);

    return { startsAt, endsAt };
  }

  private assertValidSlot(startsAt: Date, endsAt: Date) {
    if (startsAt <= new Date()) {
      throw new BadRequestException('Slot start time must be in the future');
    }

    if (endsAt <= startsAt) {
      throw new BadRequestException('Slot end time must be after start time');
    }
  }

  private async assertNoBookingOverlap(
    tx: Prisma.TransactionClient,
    expertId: string,
    startsAt: Date,
    endsAt: Date,
  ) {
    const overlapping = await tx.booking.findFirst({
      where: {
        expertId,
        status: { in: [BookingStatus.PENDING_PAYMENT, BookingStatus.CONFIRMED] },
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
      },
    });

    if (overlapping) {
      throw new BadRequestException('Expert already has a booking in this time window');
    }
  }

  private async assertExpertOwnerOrAdmin(user: AuthenticatedUser, expertId: string) {
    const expert = await this.prisma.expertProfile.findFirst({ where: { id: expertId, deletedAt: null } });

    if (!expert) {
      throw new NotFoundException('Expert not found');
    }

    if (user.role !== UserRole.ADMIN && expert.userId !== user.id) {
      throw new ForbiddenException('You do not own this expert profile');
    }

    return expert;
  }

  private async assertPublishedExpert(expertId: string) {
    const expert = await this.prisma.expertProfile.findFirst({
      where: { id: expertId, status: ExpertStatus.PUBLISHED, deletedAt: null },
    });

    if (!expert) {
      throw new NotFoundException('Expert not found');
    }

    return expert;
  }

  private async findAccessibleBooking(user: AuthenticatedUser, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: this.bookingInclude(),
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (user.role !== UserRole.ADMIN && booking.customerId !== user.id && booking.expert?.userId !== user.id) {
      throw new ForbiddenException('You cannot access this booking');
    }

    return booking;
  }
}
