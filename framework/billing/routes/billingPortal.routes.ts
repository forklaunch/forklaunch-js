import ExpressController from '../../../../common/src/interfaces/express.controller.interface';
import { Router } from '../../../../sdk-generator/forklaunch.express';
import BillingService from '../../interfaces/billingService.interface';

class BillingController implements ExpressController {
  readonly router: Router;
  readonly basePath: string;
  private service: BillingService;

  // TODO: make cache service factory where you can choose cache provider

  constructor(service: BillingService) {
    this.service = service;
    this.basePath = '/billing';
    this.router = new Router(this.basePath);

    ///////////////////////////////////////////////////////////////////////////
    // Product routes
    ///////////////////////////////////////////////////////////////////////////
    /*
    1. GET /products/:id - fetch a product with a given :id
    2. GET /products - fetch all products
    3. POST /products - create a product
    4. PUT /products/:id - update a product with a given :id
    5. DELETE /products/:id - delete a product with a given :id
    */

    // this.router.get('/products/:id', async (req,res) => {

    //   res.status(200).json({});
    // })

    // this.router.get('/products', async (req,res) => {

    //   res.status(200).json({});
    // })

    // this.router.post('/products', async (req,res) => {

    //   res.status(200).json({});
    // })

    // this.router.put('/products/:id', async (req,res) => {

    //   res.status(200).json({});
    // })

    // this.router.delete('/products/:id', async (req,res) => {

    //   res.status(200).json({});
    // })

    ///////////////////////////////////////////////////////////////////////////
    // Plan routes
    ///////////////////////////////////////////////////////////////////////////

    // List all plans
    this.router.get('/plans', async (req, res) => {
      try {
        const plans = await this.service.listPlans();
        res.status(200).json(plans);
      } catch (error) {
        res.status(500).json({ message: error });
      }
    });

    // Retrieve a plan by ID
    this.router.get('/plans/:id', async (req, res) => {
      try {
        const plan = await this.service.retrievePlan(req.params.id);
        res.status(200).json(plan);
      } catch (error) {
        res.status(500).json({ message: error });
      }
    });

    // Create a plan
    this.router.post('/plans', async (req, res) => {
      try {
        const planDto = req.body;
        const plan = await this.service.createPlan(planDto);
        res.status(201).json(plan);
      } catch (error) {
        res.status(500).json({ message: error });
      }
    });

    // Delete a plan
    this.router.delete('/plans/:id', async (req, res) => {
      try {
        await this.service.deletePlan(req.params.id);
        res.status(204).send();
      } catch (error) {
        res.status(500).json({ message: error });
      }
    });

    ///////////////////////////////////////////////////////////////////////////
    // checkout routes
    ///////////////////////////////////////////////////////////////////////////
    // Create a checkout session
    this.router.post('/checkout/session', async (req, res) => {
      try {
        const sessionDto = req.body;
        const session = await this.service.createCheckoutSession(sessionDto);
        res.status(201).json(session);
      } catch (error) {
        res.status(500).json({ message: error });
      }
    });

    // Retrieve a checkout session
    this.router.get('/checkout/session/:id', async (req, res) => {
      try {
        const session = await this.service.retrieveCheckoutSession(
          req.params.id
        );
        res.status(200).json(session);
      } catch (error) {
        res.status(500).json({ message: error });
      }
    });

    // Expire a checkout session by ID
    this.router.post('/checkout/session/:id/expire', async (req, res) => {
      try {
        const result = await this.service.expireCheckoutSession(req.params.id);
        res
          .status(200)
          .json({ message: 'Checkout session expired successfully', result });
      } catch (error) {
        res.status(500).json({ message: error });
      }
    });

    // Create a billing portal session
    this.router.post('/billing/portal/session', async (req, res) => {
      try {
        const params = req.body;
        const session = await this.service.createBillingPortalSession(params);
        res.status(201).json(session);
      } catch (error) {
        res.status(500).json({ message: error });
      }
    });

    // Create a payment link
    this.router.post('/payment/link', async (req, res) => {
      try {
        const params = req.body;
        const link = await this.service.createPaymentLink(params);
        res.status(201).json(link);
      } catch (error) {
        res.status(500).json({ message: error });
      }
    });

    // Retrieve a payment link
    this.router.get('/payment/link/:id', async (req, res) => {
      try {
        const link = await this.service.retrievePaymentLink(req.params.id);
        res.status(200).json(link);
      } catch (error) {
        res.status(500).json({ message: error });
      }
    });

    ///////////////////////////////////////////////////////////////////////////
    // Subscriptions routes
    ///////////////////////////////////////////////////////////////////////////

    // List all subscriptions
    this.router.get('/subscriptions', async (req, res) => {
      try {
        const subscriptions = await this.service.listSubscriptions(req);
        res.status(200).json(subscriptions);
      } catch (error) {
        res.status(500).json({ message: error });
      }
    });

    // Create a subscription
    this.router.post('/subscription', async (req, res) => {
      try {
        const subscriptionDto = req.body;
        const subscription =
          await this.service.createSubscription(subscriptionDto);
        res.status(201).json(subscription);
      } catch (error) {
        res.status(500).json({ message: error });
      }
    });

    // Retrieve a subscription by ID
    this.router.get('/subscriptions/:id', async (req, res) => {
      try {
        const subscription = await this.service.retrieveSubscription(
          req.params.id
        );
        res.status(200).json(subscription);
      } catch (error) {
        res.status(500).json({ message: error });
      }
    });

    // Update a subscription
    this.router.put('/subscription/:id', async (req, res) => {
      try {
        const subscriptionDto = req.body;
        await this.service.updateSubscription(req.params.id, subscriptionDto);
        res.status(200).json({ message: 'Subscription updated successfully' });
      } catch (error) {
        res.status(500).json({ message: error });
      }
    });

    // Cancel a subscription
    this.router.delete('/subscription/:id', async (req, res) => {
      try {
        await this.service.cancelSubscription(req.params.id);
        res.status(204).send();
      } catch (error) {
        res.status(500).json({ message: error });
      }
    });

    // Resume a subscription
    this.router.post('/subscription/:id/resume', async (req, res) => {
      try {
        const subscription = await this.service.resumeSubscription(
          req.params.id
        );
        res.status(200).json(subscription);
      } catch (error) {
        res.status(500).json({ message: error });
      }
    });
  }
}

export default BillingController;
