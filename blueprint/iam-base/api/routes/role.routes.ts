import { forklaunchRouter, schemaValidator } from '@forklaunch/blueprint-core';
import { sdkRouter } from '@forklaunch/core/http';
import { ci, tokens } from '../../server';
import { RoleController } from '../controllers/role.controller';

const openTelemetryCollector = ci.resolve(tokens.OpenTelemetryCollector);
const roleServiceFactory = ci.scopedResolver(tokens.RoleService);

export type RoleServiceFactory = typeof roleServiceFactory;

export const roleRouter = forklaunchRouter(
  '/role',
  schemaValidator,
  openTelemetryCollector
);

const controller = RoleController(roleServiceFactory, openTelemetryCollector);

roleRouter.post('/', controller.createRole);
roleRouter.post('/batch', controller.createBatchRoles);
roleRouter.get('/:id', controller.getRole);
roleRouter.get('/batch', controller.getBatchRoles);
roleRouter.put('/', controller.updateRole);
roleRouter.put('/batch', controller.updateBatchRoles);
roleRouter.delete('/:id', controller.deleteRole);
roleRouter.delete('/batch', controller.deleteBatchRoles);

export const roleSdkRouter = sdkRouter(schemaValidator, controller, roleRouter);
