import { forklaunchRouter, schemaValidator } from '@forklaunch/blueprint-core';
import { ci, tokens } from '../../bootstrapper';
import {
  createPermission,
  createBatchPermissions,
  getPermission,
  getBatchPermissions,
  updatePermission,
  updateBatchPermissions,
  deletePermission,
  deleteBatchPermissions
} from '../controllers/permission.controller';

const openTelemetryCollector = ci.resolve(tokens.OpenTelemetryCollector);

export const permissionRouter = forklaunchRouter(
  '/permission',
  schemaValidator,
  openTelemetryCollector
);

permissionRouter.post('/', createPermission);
permissionRouter.post('/batch', createBatchPermissions);
permissionRouter.get('/:id', getPermission);
permissionRouter.get('/batch', getBatchPermissions);
permissionRouter.put('/', updatePermission);
permissionRouter.put('/batch', updateBatchPermissions);
permissionRouter.delete('/:id', deletePermission);
permissionRouter.delete('/batch', deleteBatchPermissions);
