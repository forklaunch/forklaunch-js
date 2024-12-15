import { forklaunchRouter } from '@forklaunch/framework-core';
import { PaymentLinkController } from '../controllers/paymentLink.controller';

export const router = forklaunchRouter('/payment-link');

export const PaymentLinkRoutes = (controller: PaymentLinkController) => ({
  router,
  createPaymentLink: router.post('/', controller.createPaymentLink),
  getPaymentLink: router.get('/:id', controller.getPaymentLink),
  updatePaymentLink: router.put('/:id', controller.updatePaymentLink),
  listPaymentLinks: router.get('/', controller.listPaymentLinks),
  expirePaymentLink: router.delete('/:id', controller.expirePaymentLink),
  handlePaymentSuccess: router.get(
    '/:id/success',
    controller.handlePaymentSuccess
  ),
  handlePaymentFailure: router.get(
    '/:id/failure',
    controller.handlePaymentFailure
  )
});
