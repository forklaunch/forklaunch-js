import { array, forklaunchRouter, string } from '@forklaunch/framework-core';
import { UserService } from '../interfaces/user.service.interface';
import {
  CreateUserDtoMapper,
  UpdateUserDtoMapper,
  UserDtoMapper
} from '../models/dtoMapper/user.dtoMapper';

export const router = forklaunchRouter('/user');

export const UserRoutes = <ConfigInjectorScope>(
  service: (scope?: ConfigInjectorScope) => UserService
) => ({
  router,

  // Create user
  createUser: router.post(
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
      await service().createUser(req.body);
      res.status(201).send('User created successfully');
    }
  ),

  // Create batch users
  createUsers: router.post(
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
      await service().createBatchUsers(req.body);
      res.status(201).send('Batch users created successfully');
    }
  ),

  // Get user by ID
  getUser: router.get(
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
      res.status(200).json(await service().getUser(req.params.id));
    }
  ),

  // Get batch users by IDs
  getUsers: router.get(
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
        .json(await service().getBatchUsers(req.query.ids.split(',')));
    }
  ),

  // Update user by ID
  updateUser: router.put(
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
      await service().updateUser(req.body);
      res.status(200).send('User updated successfully');
    }
  ),

  // Update batch users by IDs
  updateUsers: router.put(
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
      await service().updateBatchUsers(req.body);
      res.status(200).send('Batch users updated successfully');
    }
  ),

  // Delete user by ID
  deleteUser: router.delete(
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
      await service().deleteUser(req.params.id);
      res.status(200).send('User deleted successfully');
    }
  ),

  // Delete batch users by IDs
  deleteUsers: router.delete(
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
      await service().deleteUsers(req.query.ids.split(','));
      res.status(200).send('Batch users deleted successfully');
    }
  ),

  // Verify user has a role
  verifyUserRole: router.get(
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
      await service().verifyHasRole(id, roleId);
      res.status(200).send('User has the specified role');
    }
  ),

  // Verify user has a permission
  verifyUserPermission: router.get(
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
      await service().verifyHasPermission(id, permissionId);
      res.status(200).send('User has the specified permission');
    }
  )
});
