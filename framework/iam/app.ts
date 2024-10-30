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
  const organizationRoutes = OrganizationRoutes(() =>
    ci.resolve('organizationService')
  );
  const permissionRoutes = PermissionRoutes(
    () => ci.resolve('permissionService'),
    () => ci.resolve('roleService')
  );
  const roleRoutes = RoleRoutes(() => ci.resolve('roleService'));
  const userRoutes = UserRoutes(
    () => ci.resolve('userService'),
    () => ci.resolve('organizationService'),
    () => ci.resolve('roleService')
  );

  app.use(organizationRoutes.router);
  app.use(roleRoutes.router);
  app.use(permissionRoutes.router);
  app.use(userRoutes.router);
  app.listen(port, () => {
    console.log(`🎉 IAM Server is running at http://localhost:${port} 🎉`);
  });
});

export type IamApiClient = ApiClient<{
  organization: typeof OrganizationRoutes;
  role: typeof RoleRoutes;
  permission: typeof PermissionRoutes;
  user: typeof UserRoutes;
}>;
