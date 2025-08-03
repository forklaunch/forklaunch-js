import { forklaunchRouter, SchemaValidator } from '@forklaunch/blueprint-core';
import { sdkRouter } from '@forklaunch/core/http';
import { ci, tokens } from '../../server';
import { PermissionController } from '../controllers/permission.controller';

const schemaValidator = SchemaValidator();
const openTelemetryCollector = ci.resolve(tokens.OpenTelemetryCollector);
const permissionServiceFactory = ci.scopedResolver(tokens.PermissionService);

export type PermissionServiceFactory = typeof permissionServiceFactory;

export const permissionRouter = forklaunchRouter(
  '/permission',
  schemaValidator,
  openTelemetryCollector
);

const controller = PermissionController(
  permissionServiceFactory,
  openTelemetryCollector
);

permissionRouter.post('/', controller.createPermission);
permissionRouter.post('/batch', controller.createBatchPermissions);
permissionRouter.get('/:id', controller.getPermission);
permissionRouter.get('/batch', controller.getBatchPermissions);
permissionRouter.put('/', controller.updatePermission);
permissionRouter.put('/batch', controller.updateBatchPermissions);
permissionRouter.delete('/:id', controller.deletePermission);
permissionRouter.delete('/batch', controller.deleteBatchPermissions);

export const permissionSdkRouter = sdkRouter(
  schemaValidator,
  controller,
  permissionRouter
);
