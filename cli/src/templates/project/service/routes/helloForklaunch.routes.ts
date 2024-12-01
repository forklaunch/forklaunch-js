import { forklaunchRouter } from '@forklaunch/framework-core';
import { HelloForklaunchController } from '../controllers/helloForklaunch.controller';

export const router = forklaunchRouter('/');

export const HelloForklaunchRoutes = <ConfigInjectorScope>(
  controller: HelloForklaunchController<ConfigInjectorScope>
) => ({
  router,

  helloForklaunch: router.get('/hello', controller.helloForklaunch)
});
