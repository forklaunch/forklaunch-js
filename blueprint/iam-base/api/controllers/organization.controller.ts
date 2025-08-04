import {
  handlers,
  IdSchema,
  schemaValidator,
  string
} from '@forklaunch/blueprint-core';
import { Metrics } from '@forklaunch/blueprint-monitoring';
import { Controller } from '@forklaunch/core/controllers';
import { OpenTelemetryCollector } from '@forklaunch/core/http';
import { OrganizationService } from '@forklaunch/interfaces-iam/interfaces';
import { UniqueConstraintViolationException } from '@mikro-orm/core';
import { OrganizationStatus } from '../../domain/enum/organizationStatus.enum';
import {
  CreateOrganizationMapper,
  OrganizationMapper,
  UpdateOrganizationMapper
} from '../../domain/mappers/organization.mappers';
import type { OrganizationServiceFactory } from '../routes/organization.routes';

export const OrganizationController = (
  serviceFactory: OrganizationServiceFactory,
  openTelemetryCollector: OpenTelemetryCollector<Metrics>
) =>
  ({
    createOrganization: handlers.post(
      schemaValidator,
      '/',
      {
        name: 'Create Organization',
        summary: 'Creates a new organization',
        body: CreateOrganizationMapper.schema(),
        responses: {
          201: OrganizationMapper.schema(),
          409: string
        }
      },
      async (req, res) => {
        openTelemetryCollector.debug('Creating organization', req.body);
        try {
          res
            .status(201)
            .json(await serviceFactory().createOrganization(req.body));
        } catch (error: unknown) {
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
      schemaValidator,
      '/:id',
      {
        name: 'Get Organization',
        summary: 'Gets an organization by ID',
        responses: {
          200: OrganizationMapper.schema(),
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
      schemaValidator,
      '/',
      {
        name: 'Update Organization',
        summary: 'Updates an organization by ID',
        body: UpdateOrganizationMapper.schema(),
        responses: {
          200: OrganizationMapper.schema(),
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
      schemaValidator,
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
  }) satisfies Controller<OrganizationService<typeof OrganizationStatus>>;
