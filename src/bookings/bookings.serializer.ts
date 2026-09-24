import { AvailabilitySlot, Booking, Payment } from '@prisma/client';

type BookingRelations = Booking & {
  customer?: { id: string; firstName: string; lastName: string; email: string };
  expert?: { id: string; headline: string; userId: string };
  service?: { id: string; title: string; durationMinutes: number };
  payment?: Payment | null;
  availabilitySlot?: AvailabilitySlot | null;
};

export function serializeAvailabilitySlot(slot: AvailabilitySlot) {
  return {
    id: slot.id,
    expertId: slot.expertId,
    startsAt: slot.startsAt,
    endsAt: slot.endsAt,
    isAvailable: slot.isAvailable,
    createdAt: slot.createdAt,
    updatedAt: slot.updatedAt,
  };
}

export function serializeBooking(booking: BookingRelations) {
  return {
    id: booking.id,
    customerId: booking.customerId,
    expertId: booking.expertId,
    serviceId: booking.serviceId,
    availabilitySlotId: booking.availabilitySlotId,
    status: booking.status,
    startsAt: booking.startsAt,
    endsAt: booking.endsAt,
    amountMinor: booking.amountMinor,
    currency: booking.currency,
    notes: booking.notes,
    customer: booking.customer,
    expert: booking.expert,
    service: booking.service,
    payment: booking.payment
      ? {
          id: booking.payment.id,
          provider: booking.payment.provider,
          status: booking.payment.status,
          amountMinor: booking.payment.amountMinor,
          currency: booking.payment.currency,
          providerReference: booking.payment.providerReference,
          checkoutUrl: booking.payment.checkoutUrl,
        }
      : null,
    availabilitySlot: booking.availabilitySlot
      ? serializeAvailabilitySlot(booking.availabilitySlot)
      : null,
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,
    cancelledAt: booking.cancelledAt,
  };
}
