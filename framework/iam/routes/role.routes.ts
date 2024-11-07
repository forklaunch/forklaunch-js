import {
  array,
  forklaunchRouter,
  SchemaValidator,
  string
} from '@forklaunch/framework-core';
import { RoleService } from '../interfaces/roleService.interface';
import {
  CreateRoleDtoMapper,
  RoleDtoMapper,
  UpdateRoleDtoMapper
} from '../models/dtoMapper/role.dtoMapper';

export const router = forklaunchRouter('/role');

export const RoleRoutes = <ConfigInjectorScope>(
  service: (scope?: ConfigInjectorScope) => RoleService
) => ({
  router,

  // Create role
  createRole: router.post(
    '/',
    {
      name: 'Create Role',
      summary: 'Creates a new role',
      body: CreateRoleDtoMapper.schema(),
      responses: {
        201: string,
        500: string
      }
    },
    async (req, res) => {
      const role = req.body;
      const roleEntity = CreateRoleDtoMapper.deserializeJsonToEntity(
        SchemaValidator(),
        role
      );

      await service().createRole(roleEntity);
      res.status(201).send('Role created successfully');
    }
  ),

  // Create batch roles
  createRoles: router.post(
    '/batch',
    {
      name: 'Create Batch Roles',
      summary: 'Creates multiple roles',
      body: array(CreateRoleDtoMapper.schema()),
      responses: {
        201: string,
        500: string
      }
    },
    async (req, res) => {
      const roles = req.body;
      const roleEntities = roles.map((role) =>
        CreateRoleDtoMapper.deserializeJsonToEntity(SchemaValidator(), role)
      );

      await service().createBatchRoles(roleEntities);
      res.status(201).send('Batch roles created successfully');
    }
  ),

  // Get role by ID
  getRole: router.get(
    '/:id',
    {
      name: 'Get Role',
      summary: 'Gets a role by ID',
      responses: {
        200: RoleDtoMapper.schema(),
        500: string
      },
      params: {
        id: string
      }
    },
    async (req, res) => {
      const id = req.params.id;
      const roleEntity = await service().getRole(id);

      const roleDto = RoleDtoMapper.serializeEntityToJson(
        SchemaValidator(),
        roleEntity
      );

      res.status(200).json(roleDto);
    }
  ),

  // Get batch roles by IDs
  getRoles: router.get(
    '/batch',
    {
      name: 'Get Batch Roles',
      summary: 'Gets multiple roles by IDs',
      responses: {
        200: array(RoleDtoMapper.schema()),
        500: string
      },
      query: {
        ids: string
      }
    },
    async (req, res) => {
      const ids = req.query.ids.split(',');
      const roles = await service().getBatchRoles(ids);

      const rolesDto = roles.map((role) =>
        RoleDtoMapper.serializeEntityToJson(SchemaValidator(), role)
      );

      res.status(200).json(rolesDto);
    }
  ),

  // Update role by ID
  updateRole: router.put(
    '/',
    {
      name: 'Update Role',
      summary: 'Updates a role by ID',
      body: UpdateRoleDtoMapper.schema(),
      responses: {
        200: string,
        500: string
      }
    },
    async (req, res) => {
      const role = req.body;
      const roleEntity = UpdateRoleDtoMapper.deserializeJsonToEntity(
        SchemaValidator(),
        role
      );

      await service().updateRole(roleEntity);
      res.status(200).send('Role updated successfully');
    }
  ),

  // Update batch roles by IDs
  updateRoles: router.put(
    '/batch',
    {
      name: 'Update Batch Roles',
      summary: 'Updates multiple roles by IDs',
      body: array(UpdateRoleDtoMapper.schema()),
      responses: {
        200: string,
        500: string
      }
    },
    async (req, res) => {
      const roles = req.body;
      const roleEntities = roles.map((role) =>
        UpdateRoleDtoMapper.deserializeJsonToEntity(SchemaValidator(), role)
      );

      await service().updateBatchRoles(roleEntities);
      res.status(200).send('Batch roles updated successfully');
    }
  ),

  // Delete role by ID
  deleteRole: router.delete(
    '/:id',
    {
      name: 'Delete Role',
      summary: 'Deletes a role by ID',
      responses: {
        200: string,
        500: string
      },
      params: {
        id: string
      }
    },
    async (req, res) => {
      const id = req.params.id;

      await service().deleteRole(id);
      res.status(200).send('Role deleted successfully');
    }
  ),

  // Delete batch roles by IDs
  deleteRoles: router.delete(
    '/batch',
    {
      name: 'Delete Batch Roles',
      summary: 'Deletes multiple roles by IDs',
      responses: {
        200: string,
        500: string
      },
      query: {
        ids: string
      }
    },
    async (req, res) => {
      const ids = req.query.ids.split(',');

      await service().deleteRoles(ids);
      res.status(200).send('Batch roles deleted successfully');
    }
  )
});
