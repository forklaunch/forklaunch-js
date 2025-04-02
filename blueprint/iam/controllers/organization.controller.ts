import {
  handlers,
  IdSchema,
  NextFunction,
  ParsedQs,
  Request,
  Response,
  SchemaValidator,
  string
} from '@forklaunch/blueprint-core';
import { OrganizationService } from '@forklaunch/blueprint-iam-interfaces';
import { Metrics } from '@forklaunch/blueprint-monitoring';
import { Controller } from '@forklaunch/core/controllers';
import { OpenTelemetryCollector } from '@forklaunch/core/http';
import { ScopedDependencyFactory } from '@forklaunch/core/services';
import { UniqueConstraintViolationException } from '@mikro-orm/core';
import {
  CreateOrganizationDtoMapper,
  OrganizationDtoMapper,
  UpdateOrganizationDtoMapper
} from '../models/dtoMapper/organization.dtoMapper';
import { OrganizationStatus } from '../models/enum/organizationStatus.enum';
import { ServiceDependencies } from '../registrations';

export const OrganizationController = (
  serviceFactory: ScopedDependencyFactory<
    SchemaValidator,
    ServiceDependencies,
    'OrganizationService'
  >,
  openTelemetryCollector: OpenTelemetryCollector<Metrics>
) =>
  ({
    createOrganization: handlers.post(
      SchemaValidator(),
      '/',
      {
        name: 'Create Organization',
        summary: 'Creates a new organization',
        body: CreateOrganizationDtoMapper.schema(),
        responses: {
          201: OrganizationDtoMapper.schema(),
          409: string
        }
      },
      async (req, res) => {
        openTelemetryCollector.debug('Creating organization', req.body);
        try {
          res
            .status(201)
            .json(await serviceFactory().createOrganization(req.body));
        } catch (error: Error | unknown) {
          if (error instanceof UniqueConstraintViolationException) {
            openTelemetryCollector.error(
              'Organization already exists',
              req.body
            );
            res.status(409).send('Organization already exists');
          } else {
            throw error;
          }
        }
      }
    ),

    getOrganization: handlers.get(
      SchemaValidator(),
      '/:id',
      {
        name: 'Get Organization',
        summary: 'Gets an organization by ID',
        responses: {
          200: OrganizationDtoMapper.schema(),
          404: string
        },
        params: IdSchema
      },
      async (req, res) => {
        openTelemetryCollector.debug('Retrieving organization', req.params);
        const organizationDto = await serviceFactory().getOrganization(
          req.params
        );
        if (organizationDto) {
          res.status(200).json(organizationDto);
        } else {
          openTelemetryCollector.error('Organization not found', req.params);
          res.status(404).send('Organization not found');
        }
      }
    ),

    updateOrganization: handlers.put(
      SchemaValidator(),
      '/',
      {
        name: 'Update Organization',
        summary: 'Updates an organization by ID',
        body: UpdateOrganizationDtoMapper.schema(),
        responses: {
          200: OrganizationDtoMapper.schema(),
          404: string
        }
      },
      async (req, res) => {
        openTelemetryCollector.debug('Updating organization', req.body);
        res
          .status(200)
          .json(await serviceFactory().updateOrganization(req.body));
      }
    ),

    deleteOrganization: handlers.delete(
      SchemaValidator(),
      '/:id',
      {
        name: 'Delete Organization',
        summary: 'Deletes an organization by ID',
        responses: {
          200: string,
          404: string
        },
        params: IdSchema
      },
      async (req, res) => {
        openTelemetryCollector.debug('Deleting organization', req.params);
        await serviceFactory().deleteOrganization(req.params);
        res.status(200).send('Organization deleted successfully');
      }
    )
  }) satisfies Controller<
    OrganizationService<typeof OrganizationStatus>,
    Request,
    Response,
    NextFunction,
    ParsedQs
  >;
