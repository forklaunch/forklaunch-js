import { ApiClient } from '@forklaunch/core/http';
import { forklaunchExpress } from '@forklaunch/framework-core';
import { bootstrap } from './bootstrapper';
import { HelloForklaunchController } from './controllers/helloForklaunch.controller';
import { HelloForklaunchRoutes } from './routes/helloForklaunch.routes';

const app = forklaunchExpress();
const port = Number(process.env.PORT) || 8001;
const host = process.env.HOST || 'localhost';

bootstrap((ci) => {
  const helloForklaunchRoutes = HelloForklaunchRoutes(
    new HelloForklaunchController(ci.scopedResolver('helloForklaunchService'))
  );
  app.use(helloForklaunchRoutes.router);

  app.listen(port, host, () => {
    console.log(
      `🎉 Hello Forklaunch Server is running at ${host}:${port} 🎉.\nAn API reference can be accessed at ${host}:${port}/api${process.env.VERSION ?? '/v1'}${process.env.SWAGGER_PATH ?? '/swagger'}`
    );
  });
});

export type ForklaunchApiClient = ApiClient<{
  helloForklaunch: typeof HelloForklaunchRoutes;
}>;
