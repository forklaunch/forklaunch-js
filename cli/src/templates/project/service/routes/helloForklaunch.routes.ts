import { forklaunchRouter } from '@{{app_name}}/core';
import { HelloForklaunchController } from '../controllers/helloForklaunch.controller';

export const router = forklaunchRouter('/');

export const HelloForklaunchRoutes = <ConfigInjectorScope>(
  controller: HelloForklaunchController<ConfigInjectorScope>
) => ({
  router,

  helloForklaunch: router.post('/hello', controller.helloForklaunch)
});
