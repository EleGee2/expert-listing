export type InitializePaymentInput = {
  bookingId: string;
  amountMinor: number;
  currency: string;
  customerEmail: string;
};

export type InitializedPayment = {
  providerReference: string;
  checkoutUrl: string;
};

export interface PaymentProviderClient {
  initialize(input: InitializePaymentInput): Promise<InitializedPayment>;
}
