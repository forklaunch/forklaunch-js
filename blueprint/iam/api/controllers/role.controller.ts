import {
  array,
  handlers,
  IdSchema,
  IdsSchema,
  SchemaValidator,
  string
} from '@forklaunch/blueprint-core';
import { Metrics } from '@forklaunch/blueprint-monitoring';
import { Controller } from '@forklaunch/core/controllers';
import { OpenTelemetryCollector } from '@forklaunch/core/http';
import { ScopedDependencyFactory } from '@forklaunch/core/services';
import { RoleService } from '@forklaunch/interfaces-iam/interfaces';
import {
  CreateRoleDtoMapper,
  RoleDtoMapper,
  UpdateRoleDtoMapper
} from '../../domain/mappers/role.mappers';
import { SchemaDependencies } from '../../registrations';

export const RoleController = (
  serviceFactory: ScopedDependencyFactory<
    SchemaValidator,
    SchemaDependencies,
    'RoleService'
  >,
  openTelemetryCollector: OpenTelemetryCollector<Metrics>
) =>
  ({
    createRole: handlers.post(
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
        openTelemetryCollector.debug('Creating role', req.body);
        await serviceFactory().createRole(req.body);
        res.status(201).send('Role created successfully');
      }
    ),

    createBatchRoles: handlers.post(
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
        openTelemetryCollector.debug('Creating batch roles', req.body);
        await serviceFactory().createBatchRoles(req.body);
        res.status(201).send('Batch roles created successfully');
      }
    ),

    getRole: handlers.get(
      SchemaValidator(),
      '/:id',
      {
        name: 'Get Role',
        summary: 'Gets a role by ID',
        responses: {
          200: RoleDtoMapper.schema(),
          500: string
        },
        params: IdSchema
      },
      async (req, res) => {
        openTelemetryCollector.debug('Retrieving role', req.params);
        res.status(200).json(await serviceFactory().getRole(req.params));
      }
    ),

    getBatchRoles: handlers.get(
      SchemaValidator(),
      '/batch',
      {
        name: 'Get Batch Roles',
        summary: 'Gets multiple roles by IDs',
        responses: {
          200: array(RoleDtoMapper.schema()),
          500: string
        },
        query: IdsSchema
      },
      async (req, res) => {
        openTelemetryCollector.debug('Retrieving batch roles', req.query);
        res.status(200).json(await serviceFactory().getBatchRoles(req.query));
      }
    ),

    updateRole: handlers.put(
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
        openTelemetryCollector.debug('Updating role', req.body);
        await serviceFactory().updateRole(req.body);
        res.status(200).send('Role updated successfully');
      }
    ),

    updateBatchRoles: handlers.put(
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
        openTelemetryCollector.debug('Updating batch roles', req.body);
        await serviceFactory().updateBatchRoles(req.body);
        res.status(200).send('Batch roles updated successfully');
      }
    ),

    deleteRole: handlers.delete(
      SchemaValidator(),
      '/:id',
      {
        name: 'Delete Role',
        summary: 'Deletes a role by ID',
        responses: {
          200: string,
          500: string
        },
        params: IdSchema
      },
      async (req, res) => {
        openTelemetryCollector.debug('Deleting role', req.params);
        await serviceFactory().deleteRole(req.params);
        res.status(200).send('Role deleted successfully');
      }
    ),

    deleteBatchRoles: handlers.delete(
      SchemaValidator(),
      '/batch',
      {
        name: 'Delete Batch Roles',
        summary: 'Deletes multiple roles by IDs',
        responses: {
          200: string,
          500: string
        },
        query: IdsSchema
      },
      async (req, res) => {
        openTelemetryCollector.debug('Deleting batch roles', req.query);
        await serviceFactory().deleteBatchRoles(req.query);
        res.status(200).send('Batch roles deleted successfully');
      }
    )
  }) satisfies Controller<RoleService>;
