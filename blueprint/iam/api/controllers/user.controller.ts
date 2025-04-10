import {
  array,
  handlers,
  IdSchema,
  IdsSchema,
  NextFunction,
  SchemaValidator,
  string
} from '@forklaunch/blueprint-core';
import { Metrics } from '@forklaunch/blueprint-monitoring';
import { Controller } from '@forklaunch/core/controllers';
import { OpenTelemetryCollector } from '@forklaunch/core/http';
import { ScopedDependencyFactory } from '@forklaunch/core/services';
import { UserService } from '@forklaunch/interfaces-iam/interfaces';
import { Request, Response } from 'express';
import { ParsedQs } from 'qs';
import {
  CreateUserDtoMapper,
  UpdateUserDtoMapper,
  UserDtoMapper
} from '../../domain/mappers/user.mappers';
import { SchemaDependencies } from '../../registrations';

export const UserController = (
  serviceFactory: ScopedDependencyFactory<
    SchemaValidator,
    SchemaDependencies,
    'UserService'
  >,
  openTelemetryCollector: OpenTelemetryCollector<Metrics>
) =>
  ({
    createUser: handlers.post(
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
        openTelemetryCollector.debug('Creating user', req.body);
        // use req context to prepopulate organizationId from AuthToken in future
        await serviceFactory().createUser(req.body);
        res.status(201).send('User created successfully');
      }
    ),

    createBatchUsers: handlers.post(
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
        openTelemetryCollector.debug('Creating batch users', req.body);
        await serviceFactory().createBatchUsers(req.body);
        res.status(201).send('Batch users created successfully');
      }
    ),

    getUser: handlers.get(
      SchemaValidator(),
      '/:id',
      {
        name: 'Get User',
        summary: 'Gets a user by ID',
        responses: {
          200: UserDtoMapper.schema(),
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
      SchemaValidator(),
      '/batch',
      {
        name: 'Get Batch Users',
        summary: 'Gets multiple users by IDs',
        responses: {
          200: array(UserDtoMapper.schema()),
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
        openTelemetryCollector.debug('Updating user', req.body);
        await serviceFactory().updateUser(req.body);
        res.status(200).send('User updated successfully');
      }
    ),

    updateBatchUsers: handlers.put(
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
        openTelemetryCollector.debug('Updating batch users', req.body);
        await serviceFactory().updateBatchUsers(req.body);
        res.status(200).send('Batch users updated successfully');
      }
    ),

    deleteUser: handlers.delete(
      SchemaValidator(),
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
      SchemaValidator(),
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

    verifyHasRole: handlers.get(
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
          ...IdSchema,
          roleId: string
        }
      },
      async (req, res) => {
        openTelemetryCollector.debug('Verifying user role', req.params);
        const { id, roleId } = req.params;
        await serviceFactory().verifyHasRole({ id }, roleId);
        res.status(200).send('User has the specified role');
      }
    ),

    verifyHasPermission: handlers.get(
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
          ...IdSchema,
          permissionId: string
        }
      },
      async (req, res) => {
        openTelemetryCollector.debug('Verifying user permission', req.params);
        const { id, permissionId } = req.params;
        await serviceFactory().verifyHasPermission(
          {
            id
          },
          permissionId
        );
        res.status(200).send('User has the specified permission');
      }
    )
  }) satisfies Controller<
    UserService,
    Request,
    Response,
    NextFunction,
    ParsedQs
  >;
