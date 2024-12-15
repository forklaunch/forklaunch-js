import { Controller } from '@forklaunch/core/controllers';
import { delete_, get, post, put } from '@forklaunch/core/http';
import { ScopedDependencyFactory } from '@forklaunch/core/services';
import { array, SchemaValidator, string } from '@forklaunch/framework-core';
import { configValidator } from '../bootstrapper';
import { UserService } from '../interfaces/user.service.interface';
import {
  CreateUserDtoMapper,
  UpdateUserDtoMapper,
  UserDtoMapper
} from '../models/dtoMapper/user.dtoMapper';

export class UserController implements Controller<UserService> {
  constructor(
    private readonly serviceFactory: ScopedDependencyFactory<
      SchemaValidator,
      typeof configValidator,
      'userService'
    >
  ) {}

  createUser = post(
    SchemaValidator(),
    '/',
    {
      name: 'Create User',
      summary: 'Creates a new user',
      body: CreateUserDtoMapper.schema(),
      responses: {
        201: string,
        500: string
      }
    },
    async (req, res) => {
      // use req context to prepopulate organizationId from AuthToken in future
      await this.serviceFactory().createUser(req.body);
      res.status(201).send('User created successfully');
    }
  );

  createBatchUsers = post(
    SchemaValidator(),
    '/batch',
    {
      name: 'Create Batch Users',
      summary: 'Creates multiple users',
      body: array(CreateUserDtoMapper.schema()),
      responses: {
        201: string,
        500: string
      }
    },
    async (req, res) => {
      await this.serviceFactory().createBatchUsers(req.body);
      res.status(201).send('Batch users created successfully');
    }
  );

  getUser = get(
    SchemaValidator(),
    '/:id',
    {
      name: 'Get User',
      summary: 'Gets a user by ID',
      responses: {
        200: UserDtoMapper.schema(),
        500: string
      },
      params: {
        id: string
      }
    },
    async (req, res) => {
      res.status(200).json(await this.serviceFactory().getUser(req.params.id));
    }
  );

  getBatchUsers = get(
    SchemaValidator(),
    '/batch',
    {
      name: 'Get Batch Users',
      summary: 'Gets multiple users by IDs',
      responses: {
        200: array(UserDtoMapper.schema()),
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
          await this.serviceFactory().getBatchUsers(req.query.ids.split(','))
        );
    }
  );

  updateUser = put(
    SchemaValidator(),
    '/',
    {
      name: 'Update User',
      summary: 'Updates a user by ID',
      body: UpdateUserDtoMapper.schema(),
      responses: {
        200: string,
        500: string
      }
    },
    async (req, res) => {
      await this.serviceFactory().updateUser(req.body);
      res.status(200).send('User updated successfully');
    }
  );

  updateBatchUsers = put(
    SchemaValidator(),
    '/batch',
    {
      name: 'Update Batch Users',
      summary: 'Updates multiple users by IDs',
      body: array(UpdateUserDtoMapper.schema()),
      responses: {
        200: string,
        500: string
      }
    },
    async (req, res) => {
      await this.serviceFactory().updateBatchUsers(req.body);
      res.status(200).send('Batch users updated successfully');
    }
  );

  deleteUser = delete_(
    SchemaValidator(),
    '/:id',
    {
      name: 'Delete User',
      summary: 'Deletes a user by ID',
      responses: {
        200: string,
        500: string
      },
      params: {
        id: string
      }
    },
    async (req, res) => {
      await this.serviceFactory().deleteUser(req.params.id);
      res.status(200).send('User deleted successfully');
    }
  );

  deleteBatchUsers = delete_(
    SchemaValidator(),
    '/batch',
    {
      name: 'Delete Batch Users',
      summary: 'Deletes multiple users by IDs',
      responses: {
        200: string,
        500: string
      },
      query: {
        ids: string
      }
    },
    async (req, res) => {
      await this.serviceFactory().deleteBatchUsers(req.query.ids.split(','));
      res.status(200).send('Batch users deleted successfully');
    }
  );

  verifyHasRole = get(
    SchemaValidator(),
    '/:id/verify-role/:roleId',
    {
      name: 'Verify User Role',
      summary: 'Verifies if a user has a specified role',
      responses: {
        200: string,
        500: string
      },
      params: {
        id: string,
        roleId: string
      }
    },
    async (req, res) => {
      const { id, roleId } = req.params;
      await this.serviceFactory().verifyHasRole(id, roleId);
      res.status(200).send('User has the specified role');
    }
  );

  verifyHasPermission = get(
    SchemaValidator(),
    '/:id/verify-permission/:permissionId',
    {
      name: 'Verify User Permission',
      summary: 'Verifies if a user has a specified permission',
      responses: {
        200: string,
        500: string
      },
      params: {
        id: string,
        permissionId: string
      }
    },
    async (req, res) => {
      const { id, permissionId } = req.params;
      await this.serviceFactory().verifyHasPermission(id, permissionId);
      res.status(200).send('User has the specified permission');
    }
  );
}
