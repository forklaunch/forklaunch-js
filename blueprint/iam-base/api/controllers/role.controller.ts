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
import { RoleService } from '@forklaunch/interfaces-iam/interfaces';
import {
  CreateRoleMapper,
  RoleMapper,
  UpdateRoleMapper
} from '../../domain/mappers/role.mappers';
import { RoleServiceFactory } from '../routes/role.routes';

export const RoleController = (
  serviceFactory: RoleServiceFactory,
  openTelemetryCollector: OpenTelemetryCollector<Metrics>
) =>
  ({
    createRole: handlers.post(
      schemaValidator,
      '/',
      {
        name: 'Create Role',
        summary: 'Creates a new role',
        body: CreateRoleMapper.schema(),
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
      schemaValidator,
      '/batch',
      {
        name: 'Create Batch Roles',
        summary: 'Creates multiple roles',
        body: array(CreateRoleMapper.schema()),
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
      schemaValidator,
      '/:id',
      {
        name: 'Get Role',
        summary: 'Gets a role by ID',
        responses: {
          200: RoleMapper.schema(),
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
      schemaValidator,
      '/batch',
      {
        name: 'Get Batch Roles',
        summary: 'Gets multiple roles by IDs',
        responses: {
          200: array(RoleMapper.schema()),
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
      schemaValidator,
      '/',
      {
        name: 'Update Role',
        summary: 'Updates a role by ID',
        body: UpdateRoleMapper.schema(),
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
      schemaValidator,
      '/batch',
      {
        name: 'Update Batch Roles',
        summary: 'Updates multiple roles by IDs',
        body: array(UpdateRoleMapper.schema()),
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
      schemaValidator,
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
      schemaValidator,
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
