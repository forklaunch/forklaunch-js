import { ApiClient } from '@forklaunch/core/http';
import { forklaunchExpress } from '@{{app_name}}/core';
import { bootstrap } from './bootstrapper';
import { HelloForklaunchController } from './controllers/helloForklaunch.controller';
import { HelloForklaunchRoutes } from './routes/helloForklaunch.routes';



bootstrap((ci) => {
  const app = forklaunchExpress();
  const host = ci.resolve('host');
  const port = ci.resolve('port');
  const version = ci.resolve('version');
  const swaggerPath = ci.resolve('swaggerPath');

  const helloForklaunchRoutes = HelloForklaunchRoutes(
    new HelloForklaunchController(ci.scopedResolver('helloForklaunchService'))
  );
  app.use(helloForklaunchRoutes.router);

  app.listen(port, host, () => {
    console.log(
      `🎉 Hello Forklaunch Server is running at ${host}:${port} 🎉.\nAn API reference can be accessed at ${host}:${port}/api${version}${swaggerPath}`
    );
  });
});

export type ForklaunchApiClient = ApiClient<{
  helloForklaunch: typeof HelloForklaunchRoutes;
}>;
