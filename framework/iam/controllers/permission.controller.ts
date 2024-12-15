import { Controller } from '@forklaunch/core/controllers';
import { delete_, get, post, put } from '@forklaunch/core/http';
import { ScopedDependencyFactory } from '@forklaunch/core/services';
import { array, SchemaValidator, string } from '@forklaunch/framework-core';
import { configValidator } from '../bootstrapper';
import { PermissionService } from '../interfaces/permission.service.interface';
import {
  CreatePermissionDtoMapper,
  PermissionDtoMapper,
  UpdatePermissionDtoMapper
} from '../models/dtoMapper/permission.dtoMapper';

export class PermissionController implements Controller<PermissionService> {
  constructor(
    private readonly serviceFactory: ScopedDependencyFactory<
      SchemaValidator,
      typeof configValidator,
      'permissionService'
    >
  ) {}

  createPermission = post(
    SchemaValidator(),
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
      await this.serviceFactory().createPermission(req.body);
      res.status(201).send('Permission created successfully');
    }
  );

  createBatchPermissions = post(
    SchemaValidator(),
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
      await this.serviceFactory().createBatchPermissions(req.body);
      res.status(201).send('Batch permissions created successfully');
    }
  );

  getPermission = get(
    SchemaValidator(),
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
      res
        .status(200)
        .json(await this.serviceFactory().getPermission(req.params.id));
    }
  );

  getBatchPermissions = get(
    SchemaValidator(),
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
        .json(
          await this.serviceFactory().getBatchPermissions(
            req.query.ids.split(',')
          )
        );
    }
  );

  updatePermission = put(
    SchemaValidator(),
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
      await this.serviceFactory().updatePermission(req.body);
      res.status(200).send('Permission updated successfully');
    }
  );

  updateBatchPermissions = put(
    SchemaValidator(),
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
      await this.serviceFactory().updateBatchPermissions(req.body);
      res.status(200).send('Batch permissions updated successfully');
    }
  );

  deletePermission = delete_(
    SchemaValidator(),
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
      await this.serviceFactory().deletePermission(req.params.id);
      res.status(200).send('Permission deleted successfully');
    }
  );

  deleteBatchPermissions = delete_(
    SchemaValidator(),
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
      await this.serviceFactory().deleteBatchPermissions(
        req.query.ids.split(',')
      );
      res.status(200).send('Batch permissions deleted successfully');
    }
  );
}
