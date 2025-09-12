import {
  array,
  handlers,
  IdSchema,
  IdsSchema,
  schemaValidator,
  string
} from '@forklaunch/blueprint-core';
import { Metrics } from '@forklaunch/blueprint-monitoring';
import { Controller } from '@forklaunch/core/controllers';
import { OpenTelemetryCollector } from '@forklaunch/core/http';
import { UserService } from '@forklaunch/interfaces-iam/interfaces';
import { PermissionMapper } from '../../domain/mappers/permission.mappers';
import { RoleMapper } from '../../domain/mappers/role.mappers';
import {
  CreateUserMapper,
  UpdateUserMapper,
  UserMapper
} from '../../domain/mappers/user.mappers';
import { UserServiceFactory } from '../routes/user.routes';

export const UserController = (
  serviceFactory: UserServiceFactory,
  openTelemetryCollector: OpenTelemetryCollector<Metrics>,
  HMAC_SECRET_KEY: string
) =>
  ({
    createUser: handlers.post(
      schemaValidator,
      '/',
      {
        name: 'Create User',
        summary: 'Creates a new user',
        body: CreateUserMapper.schema,
        responses: {
          201: string,
          500: string
        }
      },
      async (req, res) => {
        openTelemetryCollector.debug('Creating user', req.body);

        await serviceFactory().createUser(req.body);
        res.status(201).send('User created successfully');
      }
    ),

    createBatchUsers: handlers.post(
      schemaValidator,
      '/batch',
      {
        name: 'Create Batch Users',
        summary: 'Creates multiple users',
        body: array(CreateUserMapper.schema),
        responses: {
          201: string,
          500: string
        }
      },
      async (req, res) => {
        openTelemetryCollector.debug('Creating batch users', req.body);
        await serviceFactory().createBatchUsers(req.body);
        res.status(201).send('Batch users created successfully');
      }
    ),

    getUser: handlers.get(
      schemaValidator,
      '/:id',
      {
        name: 'Get User',
        summary: 'Gets a user by ID',
        responses: {
          200: UserMapper.schema,
          500: string
        },
        params: IdSchema
      },
      async (req, res) => {
        openTelemetryCollector.debug('Retrieving user', req.params);
        res.status(200).json(await serviceFactory().getUser(req.params));
      }
    ),

    getBatchUsers: handlers.get(
      schemaValidator,
      '/batch',
      {
        name: 'Get Batch Users',
        summary: 'Gets multiple users by IDs',
        responses: {
          200: array(UserMapper.schema),
          500: string
        },
        query: IdsSchema
      },
      async (req, res) => {
        openTelemetryCollector.debug('Retrieving batch users', req.query);
        res.status(200).json(await serviceFactory().getBatchUsers(req.query));
      }
    ),

    updateUser: handlers.put(
      schemaValidator,
      '/',
      {
        name: 'Update User',
        summary: 'Updates a user by ID',
        body: UpdateUserMapper.schema,
        responses: {
          200: string,
          500: string
        }
      },
      async (req, res) => {
        openTelemetryCollector.debug('Updating user', req.body);
        await serviceFactory().updateUser(req.body);
        res.status(200).send('User updated successfully');
      }
    ),

    updateBatchUsers: handlers.put(
      schemaValidator,
      '/batch',
      {
        name: 'Update Batch Users',
        summary: 'Updates multiple users by IDs',
        body: array(UpdateUserMapper.schema),
        responses: {
          200: string,
          500: string
        }
      },
      async (req, res) => {
        openTelemetryCollector.debug('Updating batch users', req.body);
        await serviceFactory().updateBatchUsers(req.body);
        res.status(200).send('Batch users updated successfully');
      }
    ),

    deleteUser: handlers.delete(
      schemaValidator,
      '/:id',
      {
        name: 'Delete User',
        summary: 'Deletes a user by ID',
        responses: {
          200: string,
          500: string
        },
        params: IdSchema
      },
      async (req, res) => {
        openTelemetryCollector.debug('Deleting user', req.params);
        await serviceFactory().deleteUser(req.params);
        res.status(200).send('User deleted successfully');
      }
    ),

    deleteBatchUsers: handlers.delete(
      schemaValidator,
      '/batch',
      {
        name: 'Delete Batch Users',
        summary: 'Deletes multiple users by IDs',
        responses: {
          200: string,
          500: string
        },
        query: IdsSchema
      },
      async (req, res) => {
        openTelemetryCollector.debug('Deleting batch users', req.query);
        await serviceFactory().deleteBatchUsers(req.query);
        res.status(200).send('Batch users deleted successfully');
      }
    ),

    /**
     * Surface User Roles
     * @param req - The request object
     * @param res - The response object
     * @returns The permissions for the user
     *
     * Leverages the HMAC authentication method to verify the user's permissions.
     *
     * To create the HMAC token, use the createHmacToken function:
     * ```typescript
     * createHmacToken({
     *   method: 'GET',
     *   path: '/123414/surface-roles',
     *   body?: {
     *     someKey: '123414'
     *   },
     *   timestamp: '1234567890',
     *   nonce: '1234567890',
     *   secretKey: 'test'
     * });
     * ```
     */
    surfaceRoles: handlers.get(
      schemaValidator,
      '/:id/surface-roles',
      {
        name: 'Surface User Roles',
        summary: 'Surfaces the roles for a user',
        auth: {
          hmac: {
            secretKeys: {
              default: HMAC_SECRET_KEY
            }
          }
        },
        responses: {
          200: array(RoleMapper.schema),
          500: string
        },
        params: {
          ...IdSchema
        }
      },
      async (req, res) => {
        openTelemetryCollector.debug('Verifying user role', req.params);
        const { id } = req.params;
        const roles = await serviceFactory().surfaceRoles({ id });
        res.status(200).json(roles);
      }
    ),

    /**
     * Surface User Permissions
     * @param req - The request object
     * @param res - The response object
     * @returns The permissions for the user
     *
     * Leverages the HMAC authentication method to verify the user's permissions.
     *
     * To create the HMAC token, use the createHmacToken function:
     * ```typescript
     * createHmacToken({
     *   method: 'GET',
     *   path: '/123414/surface-permissions',
     *   body?: {
     *     someKey: '123414'
     *   },
     *   timestamp: '1234567890',
     *   nonce: '1234567890',
     *   secretKey: 'test'
     * });
     * ```
     */
    surfacePermissions: handlers.get(
      schemaValidator,
      '/:id/surface-permissions',
      {
        name: 'Surface User Permissions',
        summary: 'Verifies if a user has a specified permission',
        auth: {
          hmac: {
            secretKeys: {
              default: HMAC_SECRET_KEY
            }
          }
        },
        responses: {
          200: array(PermissionMapper.schema),
          500: string
        },
        params: {
          ...IdSchema
        }
      },
      async (req, res) => {
        openTelemetryCollector.debug('Verifying user permission', req.params);
        const { id } = req.params;
        const permissions = await serviceFactory().surfacePermissions({ id });
        res.status(200).json(permissions);
      }
    )
  }) satisfies Controller<UserService>;
