import {
  array,
  forklaunchRouter,
  SchemaValidator,
  string
} from '@forklaunch/framework-core';
import { PermissionService } from '../interfaces/permissionService.interface';
import { RoleService } from '../interfaces/roleService.interface';
import {
  CreatePermissionDtoMapper,
  PermissionDtoMapper,
  UpdatePermissionDtoMapper
} from '../models/dtoMapper/permission.dtoMapper';
import { Role } from '../models/persistence/role.entity';

export const router = forklaunchRouter('/permission');

export const PermissionRoutes = <ConfigInjectorScope>(
  createScope: () => ConfigInjectorScope,
  service: (scope?: ConfigInjectorScope) => PermissionService,
  roleService: (scope?: ConfigInjectorScope) => RoleService
) => ({
  router,

  // Create a permission
  createPermission: router.post(
    '/',
    {
      name: 'Create Permission',
      summary: 'Creates a new permission',
      body: CreatePermissionDtoMapper.schema(),
      responses: {
        201: string,
        500: string
      }
    },
    async (req, res) => {
      const permissionEntity =
        CreatePermissionDtoMapper.deserializeJsonToEntity(
          SchemaValidator(),
          req.body
        );
      const addToRolesEntities = req.body.addToRolesIds
        ? await roleService().getBatchRoles(req.body.addToRolesIds)
        : undefined;

      await service().createPermission({
        permission: permissionEntity,
        addToRoles: addToRolesEntities
      });

      res.status(201).send('Permission created successfully');
    }
  ),

  // Create batch permissions
  createPermissions: router.post(
    '/batch',
    {
      name: 'Create Batch Permissions',
      summary: 'Creates multiple permissions',
      body: array(CreatePermissionDtoMapper.schema()),
      responses: {
        201: string,
        500: string
      }
    },
    async (req, res) => {
      const roleCache: Record<string, Role> = {};

      const batchPermissions = await Promise.all(
        req.body.map(async (createPermissionDtoMapper) => {
          const lookupRoles: string[] = [];
          createPermissionDtoMapper.addToRolesIds?.forEach((roleId) => {
            if (!roleCache[roleId]) {
              lookupRoles.push(roleId);
            }
          });
          const mergeRoles = await roleService().getBatchRoles(lookupRoles);
          mergeRoles.forEach((role) => {
            roleCache[role.id] = role;
          });
          const addToRoles = createPermissionDtoMapper.addToRolesIds?.map(
            (roleId) => roleCache[roleId]
          );

          return {
            permission: CreatePermissionDtoMapper.deserializeJsonToEntity(
              SchemaValidator(),
              createPermissionDtoMapper
            ),
            addToRoles
          };
        })
      );

      await service().createBatchPermissions(batchPermissions);

      res.status(201).send('Batch permissions created successfully');
    }
  ),

  // Get a permission by ID
  getPermission: router.get(
    '/:id',
    {
      name: 'Get Permission',
      summary: 'Gets a permission by ID',
      responses: {
        200: PermissionDtoMapper.schema(),
        500: string
      },
      params: {
        id: string
      }
    },
    async (req, res) => {
      const id = req.params.id;
      const permission = await service().getPermission(id);

      const permissionJson = PermissionDtoMapper.serializeEntityToJson(
        SchemaValidator(),
        permission
      );
      res.status(200).json(permissionJson);
    }
  ),

  // Get batch permissions by IDs
  getPermissions: router.get(
    '/batch',
    {
      name: 'Get Batch Permissions',
      summary: 'Gets multiple permissions by IDs',
      responses: {
        200: array(PermissionDtoMapper.schema()),
        500: string
      },
      query: {
        ids: string
      }
    },
    async (req, res) => {
      const ids = req.query.ids.split(',');
      const permissions = await service().getBatchPermissions(ids);
      const permissionDtos = permissions.map((permission) =>
        PermissionDtoMapper.serializeEntityToJson(SchemaValidator(), permission)
      );

      res.status(200).json(permissionDtos);
    }
  ),

  // Update a permission by ID
  updatePermission: router.put(
    '/',
    {
      name: 'Update Permission',
      summary: 'Updates a permission by ID',
      body: UpdatePermissionDtoMapper.schema(),
      responses: {
        200: string,
        500: string
      }
    },
    async (req, res) => {
      const permissionEntity =
        UpdatePermissionDtoMapper.deserializeJsonToEntity(
          SchemaValidator(),
          req.body
        );
      const addToRolesEntity = req.body.addToRolesIds
        ? await Promise.all(
            req.body.addToRolesIds.map(
              async (roleId) => await roleService().getRole(roleId)
            )
          )
        : undefined;
      const removeFromRolesEntity = req.body.removeFromRolesIds
        ? await Promise.all(
            req.body.removeFromRolesIds.map(
              async (roleId) => await roleService().getRole(roleId)
            )
          )
        : undefined;

      await service().updatePermission({
        permission: permissionEntity,
        addToRoles: addToRolesEntity,
        removeFromRoles: removeFromRolesEntity
      });
      res.status(200).send('Permission updated successfully');
    }
  ),

  // Update batch permissions by IDs
  updatePermissions: router.put(
    '/batch',
    {
      name: 'Update Batch Permissions',
      summary: 'Updates multiple permissions by IDs',
      body: array(UpdatePermissionDtoMapper.schema()),
      responses: {
        200: string,
        500: string
      }
    },
    async (req, res) => {
      const roleCache: Record<string, Role> = {};

      const batchPermissions = await Promise.all(
        req.body.map(async (updatePermissionDtoMapper) => {
          const lookupRoles: string[] = [];
          const roleIds = (
            updatePermissionDtoMapper.addToRolesIds || []
          ).concat(updatePermissionDtoMapper.removeFromRolesIds || []);
          roleIds.forEach((roleId) => {
            if (!roleCache[roleId]) {
              lookupRoles.push(roleId);
            }
          });
          const mergeRoles = await roleService().getBatchRoles(lookupRoles);
          mergeRoles.forEach((role) => {
            roleCache[role.id] = role;
          });
          const addToRoles = updatePermissionDtoMapper.addToRolesIds?.map(
            (roleId) => roleCache[roleId]
          );
          const removeFromRoles =
            updatePermissionDtoMapper.removeFromRolesIds?.map(
              (roleId) => roleCache[roleId]
            );

          return {
            permission: UpdatePermissionDtoMapper.deserializeJsonToEntity(
              SchemaValidator(),
              updatePermissionDtoMapper
            ),
            addToRoles,
            removeFromRoles
          };
        })
      );

      await service().updateBatchPermissions(batchPermissions);
      res.status(200).send('Batch permissions updated successfully');
    }
  ),

  // Delete a permission by ID
  deletePermission: router.delete(
    '/:id',
    {
      name: 'Delete Permission',
      summary: 'Deletes a permission by ID',
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
      await service().deletePermission(id);
      res.status(200).send('Permission deleted successfully');
    }
  ),

  // Delete batch permissions by IDs
  deletePermissions: router.delete(
    '/batch',
    {
      name: 'Delete Batch Permissions',
      summary: 'Deletes multiple permissions by IDs',
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
      await service().deletePermissions(ids);
      res.status(200).send('Batch permissions deleted successfully');
    }
  )
});
