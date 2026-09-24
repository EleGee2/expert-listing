import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import { InitializePaymentInput, InitializedPayment, PaymentProviderClient } from './types/payment-provider';

@Injectable()
export class MockPaymentProvider implements PaymentProviderClient {
  initialize(input: InitializePaymentInput): Promise<InitializedPayment> {
    const providerReference = `mock_${randomUUID()}`;

    return Promise.resolve({
      providerReference,
      checkoutUrl: `/api/v1/payments/mock/checkout/${providerReference}?bookingId=${input.bookingId}`,
    });
  }
}
