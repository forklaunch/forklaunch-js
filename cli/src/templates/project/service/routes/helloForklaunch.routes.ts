import { forklaunchRouter } from '@{{app_name}}/core';
import { HelloForklaunchController } from '../controllers/helloForklaunch.controller';

// defines the router for the helloForklaunch routes
export const router = forklaunchRouter('/hello');

// returns an object with the router and the helloForklaunchGet and helloForklaunchPost methods for easy installation
export const HelloForklaunchRoutes = (
  controller: HelloForklaunchController
) => ({
  router,

  helloForklaunchGet: router.get('/', controller.helloForklaunchGet),
  helloForklaunchPost: router.post('/', controller.helloForklaunchPost)
});
