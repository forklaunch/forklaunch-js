import { CheckoutSessionServiceParameters } from '../types/checkoutSession.service.types';
export interface CheckoutSessionService<
  PaymentMethodEnum,
  Params extends
    CheckoutSessionServiceParameters<PaymentMethodEnum> = CheckoutSessionServiceParameters<PaymentMethodEnum>
> {
  // for generating external links
  // store in cache, for permissions
  createCheckoutSession: (
    checkoutSessionDto: Params['CreateCheckoutSessionDto']
  ) => Promise<Params['CheckoutSessionDto']>;
  getCheckoutSession: (
    idDto: Params['IdDto']
  ) => Promise<Params['CheckoutSessionDto']>;
  expireCheckoutSession: (idDto: Params['IdDto']) => Promise<void>;

  handleCheckoutSuccess: (idDto: Params['IdDto']) => Promise<void>;
  handleCheckoutFailure: (idDto: Params['IdDto']) => Promise<void>;
}
