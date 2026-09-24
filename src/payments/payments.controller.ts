import { Body, Controller, Headers, HttpCode, HttpStatus, Post, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { BookingsService } from '@/bookings/bookings.service';
import { Public } from '@/common/decorators/public.decorator';

import { MockPaymentWebhookDto } from './dto/mock-payment-webhook.dto';

@ApiTags('payments')
@Controller({ path: 'payments', version: '1' })
export class PaymentsController {
  constructor(
    private readonly bookingsService: BookingsService,
    private readonly config: ConfigService,
  ) {}

  @Post('webhooks/mock')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Mock payment webhook confirmation' })
  confirmMockPayment(
    @Headers('x-payment-signature') signature: string | undefined,
    @Body() dto: MockPaymentWebhookDto,
  ) {
    if (signature !== this.config.getOrThrow<string>('app.payment.webhookSecret')) {
      throw new UnauthorizedException('Invalid payment webhook signature');
    }

    return this.bookingsService.confirmPaid(dto.providerReference);
  }
}
