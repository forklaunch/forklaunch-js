import { ApiClient } from '@forklaunch/core/http';
import { forklaunchExpress } from 'core';
import { bootstrap } from './bootstrapper';
import { OrganizationRoutes } from './routes/organization.routes';
import { PermissionRoutes } from './routes/permission.routes';
import { RoleRoutes } from './routes/role.routes';
import { UserRoutes } from './routes/user.routes';

const app = forklaunchExpress();
const port = Number(process.env.PORT) || 8000;

bootstrap((ci) => {
  const organizationRoutes = OrganizationRoutes((scope?: typeof ci) =>
    (scope ?? ci.createScope()).resolve('organizationService')
  );
  const permissionRoutes = PermissionRoutes(
    (scope?: typeof ci) =>
      (scope ?? ci.createScope()).resolve('permissionService'),
    (scope?: typeof ci) => (scope ?? ci.createScope()).resolve('roleService')
  );
  const roleRoutes = RoleRoutes((scope?: typeof ci) =>
    (scope ?? ci).resolve('roleService')
  );
  const userRoutes = UserRoutes(
    ci.createScope,
    (scope?: typeof ci) => (scope ?? ci.createScope()).resolve('userService'),
    (scope?: typeof ci) =>
      (scope ?? ci.createScope()).resolve('organizationService'),
    (scope?: typeof ci) => (scope ?? ci.createScope()).resolve('roleService')
  );

  app.use(organizationRoutes.router);
  app.use(roleRoutes.router);
  app.use(permissionRoutes.router);
  app.use(userRoutes.router);
  app.listen(port, () => {
    console.log(
      `🎉 IAM Server is running at http://localhost:${port} 🎉.\nAn API reference can be accessed at http://localhost:${port}/api${process.env.VERSION ?? '/v1'}${process.env.SWAGGER_PATH ?? '/swagger'}`
    );
  });
});

export type IamApiClient = ApiClient<{
  organization: typeof OrganizationRoutes;
  role: typeof RoleRoutes;
  permission: typeof PermissionRoutes;
  user: typeof UserRoutes;
}>;
