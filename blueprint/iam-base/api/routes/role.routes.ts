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
roleRouter.get('/:id', getRole);
roleRouter.get('/batch', getBatchRoles);
roleRouter.put('/', updateRole);
roleRouter.put('/batch', updateBatchRoles);
roleRouter.delete('/:id', deleteRole);
roleRouter.delete('/batch', deleteBatchRoles);
