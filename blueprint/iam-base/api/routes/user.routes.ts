import { forklaunchRouter, schemaValidator } from '@forklaunch/blueprint-core';
import { ci, tokens } from '../../bootstrapper';
import {
  createUser,
  createBatchUsers,
  getUser,
  getBatchUsers,
  updateUser,
  updateBatchUsers,
  deleteUser,
  deleteBatchUsers,
  surfaceRoles,
  surfacePermissions
} from '../controllers/user.controller';

const openTelemetryCollector = ci.resolve(tokens.OpenTelemetryCollector);

export const userRouter = forklaunchRouter(
  '/user',
  schemaValidator,
  openTelemetryCollector
);

userRouter.post('/', createUser);
userRouter.post('/batch', createBatchUsers);
userRouter.get('/:id', getUser);
userRouter.get('/batch', getBatchUsers);
userRouter.put('/', updateUser);
userRouter.put('/batch', updateBatchUsers);
userRouter.delete('/:id', deleteUser);
userRouter.delete('/batch', deleteBatchUsers);
userRouter.get('/:id/surface-roles', surfaceRoles);
userRouter.get('/:id/surface-permissions', surfacePermissions);
