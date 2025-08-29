import {
  array,
  handlers,
  IdSchema,
  IdsSchema,
  schemaValidator,
  string
} from '@forklaunch/blueprint-core';
import { Metrics } from '@forklaunch/blueprint-monitoring';
import { Controller } from '@forklaunch/core/controllers';
import { OpenTelemetryCollector } from '@forklaunch/core/http';
import { PaymentLinkService } from '@forklaunch/interfaces-billing/interfaces';
import { CurrencyEnum } from '../../domain/enum/currency.enum';
import { PaymentMethodEnum } from '../../domain/enum/paymentMethod.enum';
import { StatusEnum } from '../../domain/enum/status.enum';
import {
  CreatePaymentLinkMapper,
  PaymentLinkMapper,
  UpdatePaymentLinkMapper
} from '../../domain/mappers/paymentLink.mappers';
import { PaymentLinkServiceFactory } from '../routes/paymentLink.routes';

export const PaymentLinkController = (
  serviceFactory: PaymentLinkServiceFactory,
  openTelemetryCollector: OpenTelemetryCollector<Metrics>
) =>
  ({
    createPaymentLink: handlers.post(
      schemaValidator,
      '/',
      {
        name: 'createPaymentLink',
        summary: 'Create a payment link',
        body: CreatePaymentLinkMapper.schema,
        responses: {
          200: PaymentLinkMapper.schema
        }
      },
      async (req, res) => {
        openTelemetryCollector.debug('Creating payment link', req.body);
        res
          .status(200)
          .json(await serviceFactory().createPaymentLink(req.body));
      }
    ),

    getPaymentLink: handlers.get(
      schemaValidator,
      '/:id',
      {
        name: 'getPaymentLink',
        summary: 'Get a payment link',
        params: IdSchema,
        responses: {
          200: PaymentLinkMapper.schema
        }
      },
      async (req, res) => {
        openTelemetryCollector.debug('Retrieving payment link', req.params);
        res.status(200).json(await serviceFactory().getPaymentLink(req.params));
      }
    ),

    updatePaymentLink: handlers.put(
      schemaValidator,
      '/:id',
      {
        name: 'updatePaymentLink',
        summary: 'Update a payment link',
        body: UpdatePaymentLinkMapper.schema,
        params: IdSchema,
        responses: {
          200: PaymentLinkMapper.schema
        }
      },
      async (req, res) => {
        openTelemetryCollector.debug('Updating payment link', req.body);
        res
          .status(200)
          .json(await serviceFactory().updatePaymentLink(req.body));
      }
    ),

    expirePaymentLink: handlers.delete(
      schemaValidator,
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
        openTelemetryCollector.debug('Expiring payment link', req.params);
        await serviceFactory().expirePaymentLink(req.params);
        res.status(200).send(`Expired payment link ${req.params.id}`);
      }
    ),

    handlePaymentSuccess: handlers.get(
      schemaValidator,
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
        openTelemetryCollector.debug(
          'Handling payment link success',
          req.params
        );
        await serviceFactory().handlePaymentSuccess(req.params);
        res.status(200).send(`Handled payment success for ${req.params.id}`);
      }
    ),

    handlePaymentFailure: handlers.get(
      schemaValidator,
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
        openTelemetryCollector.debug(
          'Handling payment link failure',
          req.params
        );
        await serviceFactory().handlePaymentFailure(req.params);
        res.status(200).send(`Handled payment failure for ${req.params.id}`);
      }
    ),

    listPaymentLinks: handlers.get(
      schemaValidator,
      '/',
      {
        name: 'listPaymentLinks',
        summary: 'List payment links',
        query: IdsSchema,
        responses: {
          200: array(PaymentLinkMapper.schema)
        }
      },
      async (req, res) => {
        openTelemetryCollector.debug('Listing payment links', req.query);
        res
          .status(200)
          .json(await serviceFactory().listPaymentLinks(req.query));
      }
    )
  }) satisfies Controller<
    PaymentLinkService<
      typeof PaymentMethodEnum,
      typeof CurrencyEnum,
      typeof StatusEnum
    >
  >;
