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
import { ServiceDependencies, ServiceSchemas } from '../dependencies';
import { BillingPortalService } from '../interfaces/billingPortal.service.interface';

export const BillingPortalController = (
  serviceFactory: ScopedDependencyFactory<
    SchemaValidator,
    ServiceDependencies,
    'BillingPortalService'
  >,
  serviceSchemas: ServiceSchemas['BillingPortalService'],
  openTelemetryCollector: OpenTelemetryCollector<Metrics>
) =>
  ({
    createBillingPortalSession: handlers.post(
      SchemaValidator(),
      '/',
      {
        name: 'createBillingPortalSession',
        summary: 'Create a billing portal session',
        body: serviceSchemas.CreateBillingPortalDto,
        responses: {
          200: serviceSchemas.BillingPortalDto
        }
      },
      async (req, res) => {
        res
          .status(200)
          .json(await serviceFactory().createBillingPortalSession(req.body));
      }
    ),

    getBillingPortalSession: handlers.get(
      SchemaValidator(),
      '/:id',
      {
        name: 'getBillingPortalSession',
        summary: 'Get a billing portal session',
        params: serviceSchemas.IdDto,
        responses: {
          200: serviceSchemas.BillingPortalDto
        }
      },
      async (req, res) => {
        res
          .status(200)
          .json(await serviceFactory().getBillingPortalSession(req.params));
      }
    ),

    updateBillingPortalSession: handlers.put(
      SchemaValidator(),
      '/:id',
      {
        name: 'updateBillingPortalSession',
        summary: 'Update a billing portal session',
        params: serviceSchemas.IdDto,
        body: serviceSchemas.UpdateBillingPortalDto,
        responses: {
          200: serviceSchemas.BillingPortalDto
        }
      },
      async (req, res) => {
        res.status(200).json(
          await serviceFactory().updateBillingPortalSession({
            ...req.params,
            ...req.body
          })
        );
      }
    ),

    expireBillingPortalSession: handlers.delete(
      SchemaValidator(),
      '/:id',
      {
        name: 'expireBillingPortalSession',
        summary: 'Expire a billing portal session',
        params: serviceSchemas.IdDto,
        responses: {
          200: string
        }
      },
      async (req, res) => {
        await serviceFactory().expireBillingPortalSession(req.params);
        res.status(200).send(`Expired billing portal session ${req.params.id}`);
      }
    )
  }) satisfies Controller<
    BillingPortalService,
    Request,
    Response,
    NextFunction,
    ParsedQs
  >;
