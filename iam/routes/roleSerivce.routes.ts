import RoleService from '../interfaces/roleService.interface';
import ExpressController from '../../../common/src/interfaces/hyper.express.controller.interface';
import { forklaunchRouter } from '../../../sdk-generator/forklaunch.hyper.express';
import { CreateRoleDto, RoleDto, UpdateRoleDto } from '../models/dto/role.dto';
import { ServiceFactory } from '../../../sdk-generator/forklaunchServiceComposer';
import { array, string } from '../../../common/src/types/schema.types';
import { EntityManager } from '@mikro-orm/core';

class RoleController implements ExpressController {
  readonly basePath = '/role';
  readonly router;

  constructor(private service: ServiceFactory<RoleService>, private em: EntityManager) {
    this.router = forklaunchRouter(this.basePath);

    // Create role
    this.router.post('/', {
        name: 'Create Role',
        summary: 'Creates a new role',
        body: CreateRoleDto.schema(),
        responses: {
            201: string,
            500: string
        }
    }, async (req, res) => {
      const role = req.body;
      const roleEntity = CreateRoleDto.deserializeJsonToEntity(role);

      await this.service.create(this.em.fork()).createRole(roleEntity);
      res.status(201).send('Role created successfully');
    });

    // Create batch roles
    this.router.post('/batch', {
        name: 'Create Batch Roles',
        summary: 'Creates multiple roles',
        body: array(CreateRoleDto.schema()),
        responses: {
            201: string,
            500: string
        }
    }, async (req, res) => {
      const roles = req.body;
      const roleEntities = roles.map(role => CreateRoleDto.deserializeJsonToEntity(role));

      await this.service.create(this.em.fork()).createBatchRoles(roleEntities);
      res.status(201).send('Batch roles created successfully');
    });

    // Get role by ID
    this.router.get('/:id', {
        name: 'Get Role',
        summary: 'Gets a role by ID',
        responses: {
            200: RoleDto.schema(),
            500: string
        },
        params: {
            id: string
        }
    }, async (req, res) => {
      const id = req.params.id;
      const roleEntity = await this.service.create(this.em.fork()).getRole(id);

      const roleDto = RoleDto.serializeEntityToJson(roleEntity);

    res.status(200).json(roleDto);
    });

    // Get batch roles by IDs
    this.router.get('/batch', {
        name: 'Get Batch Roles',
        summary: 'Gets multiple roles by IDs',
        responses: {
            200: array(RoleDto.schema()),
            500: string
        },
        query: {
            ids: string
        }
    }, async (req, res) => {
      const ids = req.query.ids.split(',');
      const roles = await this.service.create(this.em.fork()).getBatchRoles(ids);

      const rolesDto = roles.map(role => RoleDto.serializeEntityToJson(role));

      res.status(200).json(rolesDto);
    });

    // Update role by ID
    this.router.put('/', {
        name: 'Update Role',
        summary: 'Updates a role by ID',
        body: UpdateRoleDto.schema(),
        responses: {
            200: string,
            500: string
        }
    }, async (req, res) => {
      const role = req.body;
      const roleEntity = UpdateRoleDto.deserializeJsonToEntity(role);

      await this.service.create(this.em.fork()).updateRole(roleEntity);
      res.status(200).send('Role updated successfully');
    });

    // Update batch roles by IDs
    this.router.put('/batch', {
        name: 'Update Batch Roles',
        summary: 'Updates multiple roles by IDs',
        body: array(UpdateRoleDto.schema()),
        responses: {
            200: string,
            500: string
        }
    }, async (req, res) => {
      const roles = req.body;
      const roleEntities = roles.map(role => UpdateRoleDto.deserializeJsonToEntity(role));
      
      await this.service.create(this.em.fork()).updateBatchRoles(roleEntities);
      res.status(200).send('Batch roles updated successfully');
    });

    // Delete role by ID
    this.router.delete('/:id', {
        name: 'Delete Role',
        summary: 'Deletes a role by ID',
        responses: {
            200: string,
            500: string
        },
        params: {
            id: string
        }
    }, async (req, res) => {
      const id = req.params.id;

      await this.service.create(this.em.fork()).deleteRole(id);
      res.status(200).send('Role deleted successfully');
    });

    // Delete batch roles by IDs
    this.router.delete('/batch', {
        name: 'Delete Batch Roles',
        summary: 'Deletes multiple roles by IDs',
        responses: {
            200: string,
            500: string
        },
        query: {
            ids: string
        }
    }, async (req, res) => {
      const ids = req.query.ids.split(',');

      await this.service.create(this.em.fork()).deleteRoles(ids);
      res.status(200).send('Batch roles deleted successfully');
    });
  }
}

export default RoleController;