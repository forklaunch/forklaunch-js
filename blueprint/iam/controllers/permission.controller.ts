import {
  array,
  handlers,
  IdSchema,
  IdsSchema,
  NextFunction,
  ParsedQs,
  Request,
  Response,
  SchemaValidator,
  string
} from '@forklaunch/blueprint-core';
import { Metrics } from '@forklaunch/blueprint-monitoring';
import { Controller } from '@forklaunch/core/controllers';
import { OpenTelemetryCollector } from '@forklaunch/core/http';
import { ScopedDependencyFactory } from '@forklaunch/core/services';
import { PermissionService } from '@forklaunch/interfaces-iam/interfaces';
import {
  CreatePermissionDtoMapper,
  PermissionDtoMapper,
  UpdatePermissionDtoMapper
} from '../models/dtoMapper/permission.dtoMapper';
import { SchemaDependencies } from '../registrations';

export const PermissionController = (
  serviceFactory: ScopedDependencyFactory<
    SchemaValidator,
    SchemaDependencies,
    'PermissionService'
  >,
  openTelemetryCollector: OpenTelemetryCollector<Metrics>
) =>
  ({
    createPermission: handlers.post(
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
        openTelemetryCollector.debug('Creating permission', req.body);
        await serviceFactory().createPermission(req.body);
        res.status(201).send('Permission created successfully');
      }
    ),

    createBatchPermissions: handlers.post(
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
        openTelemetryCollector.debug('Creating batch permissions', req.body);
        await serviceFactory().createBatchPermissions(req.body);
        res.status(201).send('Batch permissions created successfully');
      }
    ),

    getPermission: handlers.get(
      SchemaValidator(),
      '/:id',
      {
        name: 'Get Permission',
        summary: 'Gets a permission by ID',
        responses: {
          200: PermissionDtoMapper.schema(),
          500: string
        },
        params: IdSchema
      },
      async (req, res) => {
        openTelemetryCollector.debug('Retrieving permission', req.params);
        res.status(200).json(await serviceFactory().getPermission(req.params));
      }
    ),

    getBatchPermissions: handlers.get(
      SchemaValidator(),
      '/batch',
      {
        name: 'Get Batch Permissions',
        summary: 'Gets multiple permissions by IDs',
        responses: {
          200: array(PermissionDtoMapper.schema()),
          500: string
        },
        query: IdsSchema
      },
      async (req, res) => {
        openTelemetryCollector.debug('Retrieving batch permissions', req.query);
        res
          .status(200)
          .json(await serviceFactory().getBatchPermissions(req.query));
      }
    ),

    updatePermission: handlers.put(
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
        openTelemetryCollector.debug('Updating permission', req.body);
        await serviceFactory().updatePermission(req.body);
        res.status(200).send('Permission updated successfully');
      }
    ),

    updateBatchPermissions: handlers.put(
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
        openTelemetryCollector.debug('Updating batch permissions', req.body);
        await serviceFactory().updateBatchPermissions(req.body);
        res.status(200).send('Batch permissions updated successfully');
      }
    ),

    deletePermission: handlers.delete(
      SchemaValidator(),
      '/:id',
      {
        name: 'Delete Permission',
        summary: 'Deletes a permission by ID',
        responses: {
          200: string,
          500: string
        },
        params: IdSchema
      },
      async (req, res) => {
        openTelemetryCollector.debug('Deleting permission', req.params);
        await serviceFactory().deletePermission(req.params);
        res.status(200).send('Permission deleted successfully');
      }
    ),

    deleteBatchPermissions: handlers.delete(
      SchemaValidator(),
      '/batch',
      {
        name: 'Delete Batch Permissions',
        summary: 'Deletes multiple permissions by IDs',
        responses: {
          200: string,
          500: string
        },
        query: IdsSchema
      },
      async (req, res) => {
        openTelemetryCollector.debug('Deleting batch permissions', req.query);
        await serviceFactory().deleteBatchPermissions(req.query);
        res.status(200).send('Batch permissions deleted successfully');
      }
    )
  }) satisfies Controller<
    PermissionService,
    Request,
    Response,
    NextFunction,
    ParsedQs
  >;
