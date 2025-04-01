import { PaymentLinkService } from '@forklaunch/blueprint-billing-interfaces';
import {
  array,
  handlers,
  IdSchema,
  IdsSchema,
  NextFunction,
  ParsedQs,
  Request,
  Response,
  SchemaValidator,
  string
} from '@forklaunch/blueprint-core';
import { Metrics } from '@forklaunch/blueprint-monitoring';
import { Controller } from '@forklaunch/core/controllers';
import { OpenTelemetryCollector } from '@forklaunch/core/http';
import { ScopedDependencyFactory } from '@forklaunch/core/services';
import { CurrencyEnum } from '../models/enum/currency.enum';
import { PaymentLinkSchemas, ServiceDependencies } from '../registrations';

export const PaymentLinkController = (
  serviceFactory: ScopedDependencyFactory<
    SchemaValidator,
    ServiceDependencies,
    'PaymentLinkService'
  >,
  openTelemetryCollector: OpenTelemetryCollector<Metrics>
) =>
  ({
    createPaymentLink: handlers.post(
      SchemaValidator(),
      '/',
      {
        name: 'createPaymentLink',
        summary: 'Create a payment link',
        body: PaymentLinkSchemas.CreatePaymentLinkSchema(CurrencyEnum),
        responses: {
          200: PaymentLinkSchemas.PaymentLinkSchema(CurrencyEnum)
        }
      },
      async (req, res) => {
        res
          .status(200)
          .json(await serviceFactory().createPaymentLink(req.body));
      }
    ),

    getPaymentLink: handlers.get(
      SchemaValidator(),
      '/:id',
      {
        name: 'getPaymentLink',
        summary: 'Get a payment link',
        params: IdSchema,
        responses: {
          200: PaymentLinkSchemas.PaymentLinkSchema(CurrencyEnum)
        }
      },
      async (req, res) => {
        res.status(200).json(await serviceFactory().getPaymentLink(req.params));
      }
    ),

    updatePaymentLink: handlers.put(
      SchemaValidator(),
      '/:id',
      {
        name: 'updatePaymentLink',
        summary: 'Update a payment link',
        body: PaymentLinkSchemas.UpdatePaymentLinkSchema(CurrencyEnum),
        params: IdSchema,
        responses: {
          200: PaymentLinkSchemas.PaymentLinkSchema(CurrencyEnum)
        }
      },
      async (req, res) => {
        res
          .status(200)
          .json(await serviceFactory().updatePaymentLink(req.body));
      }
    ),

    expirePaymentLink: handlers.delete(
      SchemaValidator(),
      '/:id',
      {
        name: 'expirePaymentLink',
        summary: 'Expire a payment link',
        params: IdSchema,
        responses: {
          200: string
        }
      },
      async (req, res) => {
        await serviceFactory().expirePaymentLink(req.params);
        res.status(200).send(`Expired payment link ${req.params.id}`);
      }
    ),

    handlePaymentSuccess: handlers.get(
      SchemaValidator(),
      '/:id/success',
      {
        name: 'handlePaymentSuccess',
        summary: 'Handle a payment success',
        params: IdSchema,
        responses: {
          200: string
        }
      },
      async (req, res) => {
        await serviceFactory().handlePaymentSuccess(req.params);
        res.status(200).send(`Handled payment success for ${req.params.id}`);
      }
    ),

    handlePaymentFailure: handlers.get(
      SchemaValidator(),
      '/:id/failure',
      {
        name: 'handlePaymentFailure',
        summary: 'Handle a payment failure',
        params: IdSchema,
        responses: {
          200: string
        }
      },
      async (req, res) => {
        await serviceFactory().handlePaymentFailure(req.params);
        res.status(200).send(`Handled payment failure for ${req.params.id}`);
      }
    ),

    listPaymentLinks: handlers.get(
      SchemaValidator(),
      '/',
      {
        name: 'listPaymentLinks',
        summary: 'List payment links',
        query: IdsSchema,
        responses: {
          200: array(PaymentLinkSchemas.PaymentLinkSchema(CurrencyEnum))
        }
      },
      async (req, res) => {
        res
          .status(200)
          .json(await serviceFactory().listPaymentLinks(req.query));
      }
    )
  }) satisfies Controller<
    PaymentLinkService<typeof CurrencyEnum>,
    Request,
    Response,
    NextFunction,
    ParsedQs
  >;
