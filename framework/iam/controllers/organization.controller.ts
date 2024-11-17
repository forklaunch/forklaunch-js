import { Controller } from '@forklaunch/core/controllers';
import { delete_, get, post, put } from '@forklaunch/core/http';
import { SchemaValidator, string } from '@forklaunch/framework-core';
import { UniqueConstraintViolationException } from '@mikro-orm/core';
import { OrganizationService } from '../interfaces/organization.service.interface';
import {
  CreateOrganizationDtoMapper,
  OrganizationDtoMapper,
  UpdateOrganizationDtoMapper
} from '../models/dtoMapper/organization.dtoMapper';

export const OrganizationController = <ConfigInjectorScope>(
  service: (scope?: ConfigInjectorScope) => OrganizationService
) => new InternalOrganizationController(service);
export type OrganizationController<ConfigInjectorScope> =
  InternalOrganizationController<ConfigInjectorScope>;

class InternalOrganizationController<ConfigInjectorScope>
  implements Controller<OrganizationService>
{
  constructor(
    private readonly service: (
      scope?: ConfigInjectorScope
    ) => OrganizationService
  ) {}

  createOrganization = post(
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
      try {
        res.status(201).json(await this.service().createOrganization(req.body));
      } catch (error: Error | unknown) {
        if (error instanceof UniqueConstraintViolationException) {
          res.status(409).send('Organization already exists');
        } else {
          throw error;
        }
      }
    }
  );

  getOrganization = get(
    SchemaValidator(),
    '/:id',
    {
      name: 'Get Organization',
      summary: 'Gets an organization by ID',
      responses: {
        200: OrganizationDtoMapper.schema(),
        404: string
      },
      params: {
        id: string
      }
    },
    async (req, res) => {
      const organizationDto = await this.service().getOrganization(
        req.params.id
      );
      if (organizationDto) {
        res.status(200).json(organizationDto);
      } else {
        res.status(404).send('Organization not found');
      }
    }
  );

  updateOrganization = put(
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
      res.status(200).json(await this.service().updateOrganization(req.body));
    }
  );

  deleteOrganization = delete_(
    SchemaValidator(),
    '/:id',
    {
      name: 'Delete Organization',
      summary: 'Deletes an organization by ID',
      responses: {
        200: string,
        404: string
      },
      params: {
        id: string
      }
    },
    async (req, res) => {
      await this.service().deleteOrganization(req.params.id);
      res.status(200).send('Organization deleted successfully');
    }
  );
}