import { forklaunchRouter, schemaValidator } from '@forklaunch/blueprint-core';
import { ci, tokens } from '../../bootstrapper';
import {
  createBatchUsers,
  createUser,
  deleteBatchUsers,
  deleteUser,
  getBatchUsers,
  getUser,
  surfacePermissions,
  surfaceRoles,
  updateBatchUsers,
  updateUser
} from '../controllers/user.controller';

const openTelemetryCollector = ci.resolve(tokens.OpenTelemetryCollector);

export const userRouter = forklaunchRouter(
  '/user',
  schemaValidator,
  openTelemetryCollector
);

userRouter.post('/', createUser);
userRouter.post('/batch', createBatchUsers);
userRouter.get('/batch', getBatchUsers);
userRouter.get('/:id/surface-roles', surfaceRoles);
userRouter.get('/:id/surface-permissions', surfacePermissions);
userRouter.get('/:id', getUser);
userRouter.put('/', updateUser);
userRouter.put('/batch', updateBatchUsers);
userRouter.delete('/batch', deleteBatchUsers);
userRouter.delete('/:id', deleteUser);
