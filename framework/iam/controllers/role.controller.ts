import { Controller } from '@forklaunch/core/controllers';
import { delete_, get, post, put } from '@forklaunch/core/http';
import { ScopedDependencyFactory } from '@forklaunch/core/services';
import { array, SchemaValidator, string } from '@forklaunch/framework-core';
import { configValidator } from '../bootstrapper';
import { RoleService } from '../interfaces/role.service.interface';
import {
  CreateRoleDtoMapper,
  RoleDtoMapper,
  UpdateRoleDtoMapper
} from '../models/dtoMapper/role.dtoMapper';

export class RoleController implements Controller<RoleService> {
  constructor(
    private readonly serviceFactory: ScopedDependencyFactory<
      SchemaValidator,
      typeof configValidator,
      'roleService'
    >
  ) {}

  createRole = post(
    SchemaValidator(),
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
      await this.serviceFactory().createRole(req.body);
      res.status(201).send('Role created successfully');
    }
  );

  createBatchRoles = post(
    SchemaValidator(),
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
      await this.serviceFactory().createBatchRoles(req.body);
      res.status(201).send('Batch roles created successfully');
    }
  );

  getRole = get(
    SchemaValidator(),
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
      res.status(200).json(await this.serviceFactory().getRole(req.params.id));
    }
  );

  getBatchRoles = get(
    SchemaValidator(),
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
      res
        .status(200)
        .json(
          await this.serviceFactory().getBatchRoles(req.query.ids.split(','))
        );
    }
  );

  updateRole = put(
    SchemaValidator(),
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
      await this.serviceFactory().updateRole(req.body);
      res.status(200).send('Role updated successfully');
    }
  );

  updateBatchRoles = put(
    SchemaValidator(),
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
      await this.serviceFactory().updateBatchRoles(req.body);
      res.status(200).send('Batch roles updated successfully');
    }
  );

  deleteRole = delete_(
    SchemaValidator(),
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
      await this.serviceFactory().deleteRole(req.params.id);
      res.status(200).send('Role deleted successfully');
    }
  );

  deleteBatchRoles = delete_(
    SchemaValidator(),
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
      await this.serviceFactory().deleteBatchRoles(req.query.ids.split(','));
      res.status(200).send('Batch roles deleted successfully');
    }
  );
}
