import {
  handlers,
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
import { BillingPortalService } from '../interfaces/billingPortal.service.interface';
import { BillingPortalDtoMapper } from '../models/dtoMapper/billingPortal.dtoMapper';
import {
  ConfigShapes,
  SchemaRegistration,
  SchemaRegistry
} from '../registrations';

export class BillingPortalController
  implements
    Controller<
      BillingPortalService<SchemaRegistration<BillingPortalService>>,
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
      'BillingPortalService'
    >,
    private readonly openTelemetryCollector: OpenTelemetryCollector<Metrics>
  ) {}

  createBillingPortalSession = handlers.post(
    SchemaValidator(),
    '/',
    {
      name: 'createBillingPortalSession',
      summary: 'Create a billing portal session',
      body: SchemaRegistry.BillingPortal.CreateBillingPortalDto,
      responses: {
        200: BillingPortalDtoMapper.schema()
      }
    },
    async (req, res) => {
      res
        .status(200)
        .json(await this.serviceFactory().createBillingPortalSession(req.body));
    }
  );

  getBillingPortalSession = handlers.get(
    SchemaValidator(),
    '/:id',
    {
      name: 'getBillingPortalSession',
      summary: 'Get a billing portal session',
      params: {
        id: string
      },
      responses: {
        200: SchemaRegistry.BillingPortal.BillingPortalDto
      }
    },
    async (req, res) => {
      res
        .status(200)
        .json(await this.serviceFactory().getBillingPortalSession(req.params));
    }
  );

  updateBillingPortalSession = handlers.put(
    SchemaValidator(),
    '/:id',
    {
      name: 'updateBillingPortalSession',
      summary: 'Update a billing portal session',
      params: {
        id: string
      },
      body: SchemaRegistry.BillingPortal.UpdateBillingPortalDto,
      responses: {
        200: SchemaRegistry.BillingPortal.BillingPortalDto
      }
    },
    async (req, res) => {
      res.status(200).json(
        await this.serviceFactory().updateBillingPortalSession({
          ...req.params,
          ...req.body
        })
      );
    }
  );

  expireBillingPortalSession = handlers.get(
    SchemaValidator(),
    '/:id/expire',
    {
      name: 'expireBillingPortalSession',
      summary: 'Expire a billing portal session',
      params: {
        id: string
      },
      responses: {
        200: string
      }
    },
    async (req, res) => {
      await this.serviceFactory().expireBillingPortalSession(req.params);
      res.status(200).send(`Expired billing portal session ${req.params.id}`);
    }
  );
}
