import { EntityManager, UniqueConstraintViolationException } from '@mikro-orm/core';
import ExpressController from '../../../common/src/interfaces/hyper.express.controller.interface';
import { string } from '../../../common/src/types/schema.types';
import { forklaunchRouter } from '../../../sdk-generator/forklaunch.hyper.express';
import { ServiceFactory } from '../../../sdk-generator/forklaunchServiceComposer';
import OrganizationService from '../interfaces/organizationService.interface';
import { CreateOrganizationDto, OrganizationDto, UpdateOrganizationDto } from '../models/dto/organization.dto';

class OrganizationController implements ExpressController {
  readonly basePath = '/organization';
  readonly router;

  constructor(private service: ServiceFactory<OrganizationService>, private em: EntityManager) {
    this.router = forklaunchRouter(this.basePath);

    // Create organization
    this.router.post('/', {
      name: 'Create Organization',
      summary: 'Creates a new organization',
      body: CreateOrganizationDto.schema(),
      responses: {
        201: string,
        409: string
      }
    }, async (req, res) => {
      try {
        console.log(req.body);
        await this.service.create(this.em.fork()).createOrganization(CreateOrganizationDto.deserializeJsonToEntity(req.body));
        res.status(201).send(201);

      }
      catch (error: any) {
        if (error instanceof UniqueConstraintViolationException) {
          res.status(409).send('Organization already exists');
        } else {
          throw error;
        }
      }
    });

    // Get organization by ID
    this.router.get('/:id', {
      name: 'Get Organization',
      summary: 'Gets an organization by ID',
      responses: {
        200: OrganizationDto.schema(),
        404: string
      },
      params: {
        id: string
      },
      auth: {
        method: 'jwt',
      }
    },
      async (req, res) => {
        const organization = await this.service.create(this.em.fork()).getOrganization(req.params.id);
        if (organization) {
          res.status(200).json(OrganizationDto.serializeEntityToJson(organization));
        } else {
          res.status(404).send('Organization not found');
        }
      });

    // Update organization by ID
    this.router.put('/', {
      name: 'Update Organization',
      summary: 'Updates an organization by ID',
      body: UpdateOrganizationDto.schema(),
      responses: {
        200: string,
        404: string
      }
    },
      async (req, res) => {
        const organization = UpdateOrganizationDto.deserializeJsonToEntity(req.body);
        await this.service.create(this.em.fork()).updateOrganization(organization);
        res.status(200).send('Organization updated successfully');
      });

    // Delete organization by ID
    this.router.delete('/:id', {
      name: 'Delete Organization',
      summary: 'Deletes an organization by ID',
      responses: {
        200: string,
        404: string
      },
      params: {
        id: string
      }
    }, async (req, res) => {
      const id = req.params.id;
      await this.service.create(this.em.fork()).deleteOrganization(id);
      res.status(200).send('Organization deleted successfully');
    });
  }
}

export default OrganizationController;