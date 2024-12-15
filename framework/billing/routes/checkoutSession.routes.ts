import { forklaunchRouter } from '@forklaunch/framework-core';
import { CheckoutSessionController } from '../controllers/checkoutSession.controller';

export const router = forklaunchRouter('/checkout-session');

export const CheckoutSessionRoutes = (
  controller: CheckoutSessionController
) => ({
  router,
  createCheckoutSession: router.post('/', controller.createCheckoutSession),
  getCheckoutSession: router.get('/:id', controller.getCheckoutSession),
  expireCheckoutSession: router.delete(
    '/:id/expire',
    controller.expireCheckoutSession
  ),
  handleCheckoutSuccess: router.get(
    '/:id/success',
    controller.handleCheckoutSuccess
  ),
  handleCheckoutFailure: router.get(
    '/:id/failure',
    controller.handleCheckoutFailure
  )
});
