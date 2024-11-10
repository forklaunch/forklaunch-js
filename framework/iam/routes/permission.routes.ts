import { array, forklaunchRouter, string } from '@forklaunch/framework-core';
import { PermissionService } from '../interfaces/permission.service.interface';
import {
  CreatePermissionDtoMapper,
  PermissionDtoMapper,
  UpdatePermissionDtoMapper
} from '../models/dtoMapper/permission.dtoMapper';

export const router = forklaunchRouter('/permission');

export const PermissionRoutes = <ConfigInjectorScope>(
  service: (scope?: ConfigInjectorScope) => PermissionService
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
      await service().createPermission(req.body);
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
      await service().createBatchPermissions(req.body);
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
      res.status(200).json(await service().getPermission(req.params.id));
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
      res
        .status(200)
        .json(await service().getBatchPermissions(req.query.ids.split(',')));
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
      await service().updatePermission(req.body);
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
      await service().updateBatchPermissions(req.body);
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
      await service().deletePermission(req.params.id);
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
      await service().deletePermissions(req.query.ids.split(','));
      res.status(200).send('Batch permissions deleted successfully');
    }
  )
});
