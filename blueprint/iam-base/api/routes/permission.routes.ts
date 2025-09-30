import { forklaunchRouter, schemaValidator } from '@forklaunch/blueprint-core';
import { ci, tokens } from '../../bootstrapper';
import {
  createBatchPermissions,
  createPermission,
  deleteBatchPermissions,
  deletePermission,
  getBatchPermissions,
  getPermission,
  updateBatchPermissions,
  updatePermission
} from '../controllers/permission.controller';

const openTelemetryCollector = ci.resolve(tokens.OpenTelemetryCollector);

export const permissionRouter = forklaunchRouter(
  '/permission',
  schemaValidator,
  openTelemetryCollector
);

permissionRouter.post('/', createPermission);
permissionRouter.post('/batch', createBatchPermissions);
permissionRouter.get('/batch', getBatchPermissions);
permissionRouter.get('/:id', getPermission);
permissionRouter.put('/', updatePermission);
permissionRouter.put('/batch', updateBatchPermissions);
permissionRouter.delete('/batch', deleteBatchPermissions);
permissionRouter.delete('/:id', deletePermission);
