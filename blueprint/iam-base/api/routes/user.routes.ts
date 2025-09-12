import { forklaunchRouter, schemaValidator } from '@forklaunch/blueprint-core';
import { sdkRouter } from '@forklaunch/core/http';
import { ci, tokens } from '../../bootstrapper';
import { UserController } from '../controllers/user.controller';

const openTelemetryCollector = ci.resolve(tokens.OpenTelemetryCollector);
const userServiceFactory = ci.scopedResolver(tokens.UserService);
const HMAC_SECRET_KEY = ci.resolve(tokens.HMAC_SECRET_KEY);

export type UserServiceFactory = typeof userServiceFactory;

export const userRouter = forklaunchRouter(
  '/user',
  schemaValidator,
  openTelemetryCollector
);
const controller = UserController(
  userServiceFactory,
  openTelemetryCollector,
  HMAC_SECRET_KEY
);

userRouter.post('/', controller.createUser);
userRouter.post('/batch', controller.createBatchUsers);
userRouter.get('/:id', controller.getUser);
userRouter.get('/batch', controller.getBatchUsers);
userRouter.put('/', controller.updateUser);
userRouter.put('/batch', controller.updateBatchUsers);
userRouter.delete('/:id', controller.deleteUser);
userRouter.delete('/batch', controller.deleteBatchUsers);
userRouter.get('/:id/surface-roles', controller.surfaceRoles);
userRouter.get('/:id/surface-permissions', controller.surfacePermissions);

export const userSdkRouter = sdkRouter(schemaValidator, controller, userRouter);
