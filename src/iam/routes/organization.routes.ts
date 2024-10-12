import { UniqueConstraintViolationException } from '@mikro-orm/core';
import { forklaunchRouter, SchemaValidator, string } from 'core';
import { ci } from '../app';
import {
  CreateOrganizationDtoMapper,
  OrganizationDtoMapper,
  UpdateOrganizationDtoMapper
} from '../models/dtoMapper/organization.dtoMapper';

export const router = forklaunchRouter('/organization');
const service = () => ci.resolve('organizationService');

export const organizationRoutes = {
  // Create organization
  createOrganization: router.post(
    '/',
    {
      name: 'Create Organization',
      summary: 'Creates a new organization',
      body: CreateOrganizationDtoMapper.schema(),
      responses: {
        201: string,
        409: string
      }
    },
    async (req, res) => {
      try {
        console.log(req.body);
        await service().createOrganization(
          CreateOrganizationDtoMapper.deserializeJsonToEntity(
            SchemaValidator(),
            req.body
          )
        );
        res.status(201).send('Organization created successfully');
      } catch (error: Error | unknown) {
        if (error instanceof UniqueConstraintViolationException) {
          res.status(409).send('Organization already exists');
        } else {
          throw error;
        }
      }
    }
  ),

  // Get organization by ID
  getOrganization: router.get(
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
      const organization = await service().getOrganization(req.params.id);
      if (organization) {
        const organizationJson = OrganizationDtoMapper.serializeEntityToJson(
          SchemaValidator(),
          organization
        );
        res.status(200).json(organizationJson);
      } else {
        res.status(404).send('Organization not found');
      }
    }
  ),

  // Update organization by ID
  updateOrganization: router.put(
    '/',
    {
      name: 'Update Organization',
      summary: 'Updates an organization by ID',
      body: UpdateOrganizationDtoMapper.schema(),
      responses: {
        200: string,
        404: string
      }
    },
    async (req, res) => {
      const organization = UpdateOrganizationDtoMapper.deserializeJsonToEntity(
        SchemaValidator(),
        req.body
      );
      await service().updateOrganization(organization);
      res.status(200).send('Organization updated successfully');
    }
  ),

  // Delete organization by ID
  deleteOrganization: router.delete(
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
      const id = req.params.id;
      await service().deleteOrganization(id);
      res.status(200).send('Organization deleted successfully');
    }
  )
};