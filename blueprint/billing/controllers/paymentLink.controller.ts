import {
  array,
  handlers,
  IdsDtoSchema,
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
import { ServiceDependencies, ServiceSchemas } from '../dependencies';
import { PaymentLinkService } from '../interfaces/paymentLink.service.interface';

export const PaymentLinkController = (
  serviceFactory: ScopedDependencyFactory<
    SchemaValidator,
    ServiceDependencies,
    'PaymentLinkService'
  >,
  schemaRegistry: ServiceSchemas['PaymentLinkService'],
  openTelemetryCollector: OpenTelemetryCollector<Metrics>
) =>
  ({
    createPaymentLink: handlers.post(
      SchemaValidator(),
      '/',
      {
        name: 'createPaymentLink',
        summary: 'Create a payment link',
        body: schemaRegistry.CreatePaymentLinkDto,
        responses: {
          200: schemaRegistry.PaymentLinkDto
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
        params: schemaRegistry.IdDto,
        responses: {
          200: schemaRegistry.PaymentLinkDto
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
        body: schemaRegistry.UpdatePaymentLinkDto,
        params: schemaRegistry.IdDto,
        responses: {
          200: schemaRegistry.PaymentLinkDto
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
        params: schemaRegistry.IdDto,
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
        params: schemaRegistry.IdDto,
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
        params: schemaRegistry.IdDto,
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
        query: IdsDtoSchema,
        responses: {
          200: array(schemaRegistry.PaymentLinkDto)
        }
      },
      async (req, res) => {
        res
          .status(200)
          .json(await serviceFactory().listPaymentLinks(req.query));
      }
    )
  }) satisfies Controller<
    PaymentLinkService,
    Request,
    Response,
    NextFunction,
    ParsedQs
  >;
