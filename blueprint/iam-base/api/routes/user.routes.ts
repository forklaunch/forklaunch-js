import { forklaunchRouter, schemaValidator } from '@forklaunch/blueprint-core';
import { sdkRouter } from '@forklaunch/core/http';
import { ci, tokens } from '../../bootstrapper';
import { UserController } from '../controllers/user.controller';

const openTelemetryCollector = ci.resolve(tokens.OpenTelemetryCollector);
const userServiceFactory = ci.scopedResolver(tokens.UserService);

export type UserServiceFactory = typeof userServiceFactory;

export const userRouter = forklaunchRouter(
  '/user',
  schemaValidator,
  openTelemetryCollector
);
const controller = UserController(userServiceFactory, openTelemetryCollector);

userRouter.post('/', controller.createUser);
userRouter.post('/batch', controller.createBatchUsers);
userRouter.get('/:id', controller.getUser);
userRouter.get('/batch', controller.getBatchUsers);
userRouter.put('/', controller.updateUser);
userRouter.put('/batch', controller.updateBatchUsers);
userRouter.delete('/:id', controller.deleteUser);
userRouter.delete('/batch', controller.deleteBatchUsers);
userRouter.get('/:id/verify-role/:roleId', controller.verifyHasRole);
userRouter.get(
  '/:id/verify-permission/:permissionId',
  controller.verifyHasPermission
);

export const userSdkRouter = sdkRouter(schemaValidator, controller, userRouter);
