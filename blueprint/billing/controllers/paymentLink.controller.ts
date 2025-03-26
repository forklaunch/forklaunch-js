import {
  array,
  handlers,
  NextFunction,
  optional,
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
import { PaymentLinkService } from '../interfaces/paymentLink.service.interface';
import { PaymentLinkDtoMapper } from '../models/dtoMapper/paymentLink.dtoMapper';
import {
  ConfigShapes,
  SchemaRegistrations,
  SchemaRegistry
} from '../registrations';

export class PaymentLinkController
  implements
    Controller<
      PaymentLinkService<SchemaRegistrations['PaymentLink']>,
      Request,
      Response,
      NextFunction,
      ParsedQs
    >
{
  constructor(
    private readonly serviceFactory: ScopedDependencyFactory<
      SchemaValidator,
      ConfigShapes,
      'PaymentLinkService'
    >,
    private readonly openTelemetryCollector: OpenTelemetryCollector<Metrics>
  ) {}

  createPaymentLink = handlers.post(
    SchemaValidator(),
    '/',
    {
      name: 'createPaymentLink',
      summary: 'Create a payment link',
      body: SchemaRegistry.PaymentLink.CreatePaymentLinkDto,
      responses: {
        200: PaymentLinkDtoMapper.schema()
      }
    },
    async (req, res) => {
      res
        .status(200)
        .json(await this.serviceFactory().createPaymentLink(req.body));
    }
  );

  getPaymentLink = handlers.get(
    SchemaValidator(),
    '/:id',
    {
      name: 'getPaymentLink',
      summary: 'Get a payment link',
      params: {
        id: string
      },
      responses: {
        200: PaymentLinkDtoMapper.schema()
      }
    },
    async (req, res) => {
      res
        .status(200)
        .json(await this.serviceFactory().getPaymentLink(req.params));
    }
  );

  updatePaymentLink = handlers.put(
    SchemaValidator(),
    '/:id',
    {
      name: 'updatePaymentLink',
      summary: 'Update a payment link',
      body: SchemaRegistry.PaymentLink.UpdatePaymentLinkDto,
      params: {
        id: string
      },
      responses: {
        200: PaymentLinkDtoMapper.schema()
      }
    },
    async (req, res) => {
      res
        .status(200)
        .json(await this.serviceFactory().updatePaymentLink(req.body));
    }
  );

  expirePaymentLink = handlers.delete(
    SchemaValidator(),
    '/:id',
    {
      name: 'expirePaymentLink',
      summary: 'Expire a payment link',
      params: {
        id: string
      },
      responses: {
        200: string
      }
    },
    async (req, res) => {
      await this.serviceFactory().expirePaymentLink(req.params);
      res.status(200).send(`Expired payment link ${req.params.id}`);
    }
  );

  handlePaymentSuccess = handlers.get(
    SchemaValidator(),
    '/:id/success',
    {
      name: 'handlePaymentSuccess',
      summary: 'Handle a payment success',
      params: {
        id: string
      },
      responses: {
        200: string
      }
    },
    async (req, res) => {
      await this.serviceFactory().handlePaymentSuccess(req.params);
      res.status(200).send(`Handled payment success for ${req.params.id}`);
    }
  );

  handlePaymentFailure = handlers.get(
    SchemaValidator(),
    '/:id/failure',
    {
      name: 'handlePaymentFailure',
      summary: 'Handle a payment failure',
      params: {
        id: string
      },
      responses: {
        200: string
      }
    },
    async (req, res) => {
      await this.serviceFactory().handlePaymentFailure(req.params);
      res.status(200).send(`Handled payment failure for ${req.params.id}`);
    }
  );

  listPaymentLinks = handlers.get(
    SchemaValidator(),
    '/',
    {
      name: 'listPaymentLinks',
      summary: 'List payment links',
      query: {
        ids: optional(array(string))
      },
      responses: {
        200: array(PaymentLinkDtoMapper.schema())
      }
    },
    async (req, res) => {
      res
        .status(200)
        .json(await this.serviceFactory().listPaymentLinks(req.query));
    }
  );
}
