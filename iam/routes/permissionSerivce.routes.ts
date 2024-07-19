import { Role } from '../models/mikro/entities/role.entity';
import PermissionService from '../interfaces/permissionService.interface';
import ExpressController from '../../../common/src/interfaces/hyper.express.controller.interface';
import { forklaunchRouter } from '../../../sdk-generator/forklaunch.hyper.express';
import { CreatePermissionDto, PermissionDto, UpdatePermissionDto } from '../models/dto/permission.dto';
import RoleService from '../interfaces/roleService.interface';
import { ServiceFactory } from '../../../sdk-generator/forklaunchServiceComposer';
import { array, string } from '../../../common/src/types/schema.types';
import { EntityManager } from '@mikro-orm/core';

class PermissionController implements ExpressController {
  readonly basePath = '/permission';
  readonly router;

  constructor(private service: ServiceFactory<PermissionService>, private roleService: ServiceFactory<RoleService>, private em: EntityManager) {
    this.router = forklaunchRouter(this.basePath);

    // Create a permission
    this.router.post('/', {
        name: 'Create Permission',
        summary: 'Creates a new permission',
        body: CreatePermissionDto.schema(),
        responses: {
            201: string,
            500: string
        }
    }, async (req, res) => {
        const permissionEntity = CreatePermissionDto.deserializeJsonToEntity(req.body);
        const addToRolesEntities = req.body.addToRolesIds ? await this.roleService.create(this.em.fork()).getBatchRoles(req.body.addToRolesIds) : undefined;

        await this.service.create(this.em.fork()).createPermission({
            permission: permissionEntity,
            addToRoles: addToRolesEntities
        });

        res.status(201).send('Permission created successfully');
    });

    // Create batch permissions
    this.router.post('/batch', {
        name: 'Create Batch Permissions',
        summary: 'Creates multiple permissions',
        body: array(CreatePermissionDto.schema()),
        responses: {
            201: string,
            500: string
        }
    }, async (req, res) => {
      const roleCache: Record<string, Role> = {};

      const batchPermissions = await Promise.all(req.body.map(async createPermissionDto => {
        const lookupRoles: string[] = [];
        createPermissionDto.addToRolesIds?.forEach(roleId => {
          if (!roleCache[roleId]) {
            lookupRoles.push(roleId);
          }
        });
        const mergeRoles = await this.roleService.create(this.em.fork()).getBatchRoles(lookupRoles);
        mergeRoles.forEach(role => {
          roleCache[role.id] = role;
        });
        const addToRoles = createPermissionDto.addToRolesIds?.map(roleId => roleCache[roleId]);

        return {
          permission: CreatePermissionDto.deserializeJsonToEntity(createPermissionDto), 
          addToRoles
        };
      }));

      await this.service.create(this.em.fork()).createBatchPermissions(batchPermissions);

      res.status(201).send('Batch permissions created successfully');

    });

    // Get a permission by ID
    this.router.get('/:id', {
        name: 'Get Permission',
        summary: 'Gets a permission by ID',
        responses: {
            200: PermissionDto.schema(),
            500: string
        },
        params: {
            id: string
        }
    }, async (req, res) => {
      const id = req.params.id;
      const permission = await this.service.create(this.em.fork()).getPermission(id);

      res.status(200).json(PermissionDto.serializeEntityToJson(permission));
    });

    // Get batch permissions by IDs
    this.router.get('/batch',{
        name: 'Get Batch Permissions',
        summary: 'Gets multiple permissions by IDs',
        responses: {
            200: array(PermissionDto.schema()),
            500: string
        },
        query: {
            ids: string
        }
    }, async (req, res) => {
      const ids = req.query.ids.split(',');
      const permissions = await this.service.create(this.em.fork()).getBatchPermissions(ids);
      const permissionDtos = permissions.map(permission => PermissionDto.serializeEntityToJson(permission));

      res.status(200).json(permissionDtos);

    });

    // Update a permission by ID
    this.router.put('/', {
        name: 'Update Permission',
        summary: 'Updates a permission by ID',
        body: UpdatePermissionDto.schema(),
        responses: {
            200: string,
            500: string
        }
    }, async (req, res) => {
      const permissionEntity = UpdatePermissionDto.deserializeJsonToEntity(req.body);
      const addToRolesEntity = req.body.addToRolesIds ? await Promise.all(req.body.addToRolesIds.map(async roleId => await this.roleService.create(this.em.fork()).getRole(roleId))) : undefined;
      const removeFromRolesEntity = req.body.removeFromRolesIds ? await Promise.all(req.body.removeFromRolesIds.map(async roleId => await this.roleService.create(this.em.fork()).getRole(roleId))) : undefined

      await this.service.create(this.em.fork()).updatePermission({
          permission: permissionEntity,
          addToRoles: addToRolesEntity,
          removeFromRoles: removeFromRolesEntity
      });
      res.status(200).send('Permission updated successfully');
    });

    // Update batch permissions by IDs
    this.router.put('/batch', {
        name: 'Update Batch Permissions',
        summary: 'Updates multiple permissions by IDs',
        body: array(UpdatePermissionDto.schema()),
        responses: {
            200: string,
            500: string
        }
    }, async (req, res)=> {
      const roleCache: Record<string, Role> = {};

      const batchPermissions = await Promise.all(req.body.map(async updatePermissionDto => {
        const lookupRoles: string[] = [];
        const roleIds = (updatePermissionDto.addToRolesIds || []).concat(updatePermissionDto.removeFromRolesIds || []);
        roleIds.forEach(roleId => {
          if (!roleCache[roleId]) {
            lookupRoles.push(roleId);
          }
        });
        const mergeRoles = await this.roleService.create(this.em.fork()).getBatchRoles(lookupRoles);
        mergeRoles.forEach(role => {
          roleCache[role.id] = role;
        });
        const addToRoles = updatePermissionDto.addToRolesIds?.map(roleId => roleCache[roleId]);
        const removeFromRoles = updatePermissionDto.removeFromRolesIds?.map(roleId => roleCache[roleId]);

        return {
          permission: UpdatePermissionDto.deserializeJsonToEntity(updatePermissionDto),
          addToRoles,
          removeFromRoles
        }
      }));

      await this.service.create(this.em.fork()).updateBatchPermissions(batchPermissions);
      res.status(200).send('Batch permissions updated successfully');
    });

    // Delete a permission by ID
    this.router.delete('/:id', {
        name: 'Delete Permission',
        summary: 'Deletes a permission by ID',
        responses: {
            200: string,
            500: string
        },
        params: {
            id: string
        }
    }, async (req, res) => {
      const id = req.params.id;
      await this.service.create(this.em.fork()).deletePermission(id);
      res.status(200).send('Permission deleted successfully');
    });

    // Delete batch permissions by IDs
    this.router.delete('/batch', {
        name: 'Delete Batch Permissions',
        summary: 'Deletes multiple permissions by IDs',
        responses: {
            200: string,
            500: string
        },
        query: {
            ids: string
        }
    }, async (req, res) => {
      const ids = req.query.ids.split(',');
      await this.service.create(this.em.fork()).deletePermissions(ids);
      res.status(200).send('Batch permissions deleted successfully');
    });
  }
}

export default PermissionController;