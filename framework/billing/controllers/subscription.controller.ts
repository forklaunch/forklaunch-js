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
import { SubscriptionService } from '../interfaces/subscription.service.interface';
import {
  CreateSubscriptionDtoMapper,
  SubscriptionDtoMapper,
  UpdateSubscriptionDtoMapper
} from '../models/dtoMapper/subscription.dtoMapper';

export class SubscriptionController implements Controller<SubscriptionService> {
  constructor(
    private readonly serviceFactory: ScopedDependencyFactory<
      SchemaValidator,
      typeof configValidator,
      'subscriptionService'
    >
  ) {}

  createSubscription = post(
    SchemaValidator(),
    '/',
    {
      name: 'createSubscription',
      summary: 'Create a subscription',
      body: CreateSubscriptionDtoMapper.schema(),
      responses: {
        200: SubscriptionDtoMapper.schema()
      }
    },
    async (req, res) => {
      res
        .status(200)
        .json(await this.serviceFactory().createSubscription(req.body));
    }
  );

  getSubscription = get(
    SchemaValidator(),
    '/:id',
    {
      name: 'getSubscription',
      summary: 'Get a subscription',
      params: {
        id: string
      },
      responses: {
        200: SubscriptionDtoMapper.schema()
      }
    },
    async (req, res) => {
      res
        .status(200)
        .json(await this.serviceFactory().getSubscription(req.params.id));
    }
  );

  getUserSubscription = get(
    SchemaValidator(),
    '/user/:id',
    {
      name: 'getUserSubscription',
      summary: 'Get a user subscription',
      params: {
        id: string
      },
      responses: {
        200: SubscriptionDtoMapper.schema()
      }
    },
    async (req, res) => {
      res
        .status(200)
        .json(await this.serviceFactory().getUserSubscription(req.params.id));
    }
  );

  getOrganizationSubscription = get(
    SchemaValidator(),
    '/organization/:id',
    {
      name: 'getOrganizationSubscription',
      summary: 'Get an organization subscription',
      params: {
        id: string
      },
      responses: {
        200: SubscriptionDtoMapper.schema()
      }
    },
    async (req, res) => {
      res
        .status(200)
        .json(
          await this.serviceFactory().getOrganizationSubscription(req.params.id)
        );
    }
  );

  updateSubscription = put(
    SchemaValidator(),
    '/:id',
    {
      name: 'updateSubscription',
      summary: 'Update a subscription',
      params: {
        id: string
      },
      body: UpdateSubscriptionDtoMapper.schema(),
      responses: {
        200: SubscriptionDtoMapper.schema()
      }
    },
    async (req, res) => {
      res
        .status(200)
        .json(await this.serviceFactory().updateSubscription(req.body));
    }
  );

  deleteSubscription = delete_(
    SchemaValidator(),
    '/:id',
    {
      name: 'deleteSubscription',
      summary: 'Delete a subscription',
      params: {
        id: string
      },
      responses: {
        200: string
      }
    },
    async (req, res) => {
      await this.serviceFactory().deleteSubscription(req.params.id);
      res.status(200).send(`Deleted subscription ${req.params.id}`);
    }
  );

  listSubscriptions = get(
    SchemaValidator(),
    '/',
    {
      name: 'listSubscriptions',
      summary: 'List subscriptions',
      query: {
        ids: optional(array(string))
      },
      responses: {
        200: array(SubscriptionDtoMapper.schema())
      }
    },
    async (req, res) => {
      res
        .status(200)
        .json(await this.serviceFactory().listSubscriptions(req.query.ids));
    }
  );

  cancelSubscription = get(
    SchemaValidator(),
    '/:id/cancel',
    {
      name: 'cancelSubscription',
      summary: 'Cancel a subscription',
      params: {
        id: string
      },
      responses: {
        200: string
      }
    },
    async (req, res) => {
      await this.serviceFactory().cancelSubscription(req.params.id);
      res.status(200).send(`Cancelled subscription ${req.params.id}`);
    }
  );

  resumeSubscription = get(
    SchemaValidator(),
    '/:id/resume',
    {
      name: 'resumeSubscription',
      summary: 'Resume a subscription',
      params: {
        id: string
      },
      responses: {
        200: string
      }
    },
    async (req, res) => {
      await this.serviceFactory().resumeSubscription(req.params.id);
      res.status(200).send(`Resumed subscription ${req.params.id}`);
    }
  );
}
