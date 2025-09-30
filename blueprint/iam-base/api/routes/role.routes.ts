import { forklaunchRouter, schemaValidator } from '@forklaunch/blueprint-core';
import { ci, tokens } from '../../bootstrapper';
import {
  createBatchRoles,
  createRole,
  deleteBatchRoles,
  deleteRole,
  getBatchRoles,
  getRole,
  updateBatchRoles,
  updateRole
} from '../controllers/role.controller';

const openTelemetryCollector = ci.resolve(tokens.OpenTelemetryCollector);

export const roleRouter = forklaunchRouter(
  '/role',
  schemaValidator,
  openTelemetryCollector
);

roleRouter.post('/', createRole);
roleRouter.post('/batch', createBatchRoles);
roleRouter.get('/batch', getBatchRoles);
roleRouter.get('/:id', getRole);
roleRouter.put('/', updateRole);
roleRouter.put('/batch', updateBatchRoles);
roleRouter.delete('/batch', deleteBatchRoles);
roleRouter.delete('/:id', deleteRole);
