import { Module } from '@nestjs/common';

import { MockPaymentProvider } from '@/payments/mock-payment.provider';

import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';

@Module({
  controllers: [BookingsController],
  providers: [BookingsService, MockPaymentProvider],
  exports: [BookingsService],
})
export class BookingsModule {}
