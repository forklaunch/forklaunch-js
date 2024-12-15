import { Controller } from '@forklaunch/core/controllers';
import { delete_, get, post, put } from '@forklaunch/core/http';
import { ScopedDependencyFactory } from '@forklaunch/core/services';
import {
  array,
  optional,
  SchemaValidator,
  string
} from '@forklaunch/framework-core';
import { configValidator } from '../bootstrapper';
import { PaymentLinkService } from '../interfaces/paymentLink.service.interface';
import {
  CreatePaymentLinkDtoMapper,
  PaymentLinkDtoMapper,
  UpdatePaymentLinkDtoMapper
} from '../models/dtoMapper/paymentLink.dtoMapper';

export class PaymentLinkController implements Controller<PaymentLinkService> {
  constructor(
    private readonly serviceFactory: ScopedDependencyFactory<
      SchemaValidator,
      typeof configValidator,
      'paymentLinkService'
    >
  ) {}

  createPaymentLink = post(
    SchemaValidator(),
    '/',
    {
      name: 'createPaymentLink',
      summary: 'Create a payment link',
      body: CreatePaymentLinkDtoMapper.schema(),
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

  getPaymentLink = get(
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
        .json(await this.serviceFactory().getPaymentLink(req.params.id));
    }
  );

  updatePaymentLink = put(
    SchemaValidator(),
    '/:id',
    {
      name: 'updatePaymentLink',
      summary: 'Update a payment link',
      body: UpdatePaymentLinkDtoMapper.schema(),
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

  expirePaymentLink = delete_(
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
      await this.serviceFactory().expirePaymentLink(req.params.id);
      res.status(200).send(`Expired payment link ${req.params.id}`);
    }
  );

  handlePaymentSuccess = get(
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
      await this.serviceFactory().handlePaymentSuccess(req.params.id);
      res.status(200).send(`Handled payment success for ${req.params.id}`);
    }
  );

  handlePaymentFailure = get(
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
      await this.serviceFactory().handlePaymentFailure(req.params.id);
      res.status(200).send(`Handled payment failure for ${req.params.id}`);
    }
  );

  listPaymentLinks = get(
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
        .json(await this.serviceFactory().listPaymentLinks(req.query.ids));
    }
  );
}
