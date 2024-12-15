import { forklaunchRouter } from '@{{app_name}}/core';
import { HelloForklaunchController } from '../controllers/helloForklaunch.controller';

export const router = forklaunchRouter('/hello');

export const HelloForklaunchRoutes = (
  controller: HelloForklaunchController
) => ({
  router,

  helloForklaunchGet: router.get('/', controller.helloForklaunchGet),
  helloForklaunchPost: router.post('/', controller.helloForklaunchPost)
});
