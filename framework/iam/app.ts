import { ApiClient } from '@forklaunch/core/http';
import { forklaunchExpress } from '@forklaunch/framework-core';
import { bootstrap } from './bootstrapper';
import { OrganizationController } from './controllers/organization.controller';
import { PermissionController } from './controllers/permission.controller';
import { RoleController } from './controllers/role.controller';
import { UserController } from './controllers/user.controller';
import { OrganizationRoutes } from './routes/organization.routes';
import { PermissionRoutes } from './routes/permission.routes';
import { RoleRoutes } from './routes/role.routes';
import { UserRoutes } from './routes/user.routes';

const app = forklaunchExpress();
const port = Number(process.env.PORT) || 8000;

bootstrap((ci) => {
  const organizationRoutes = OrganizationRoutes(
    OrganizationController(ci.scopedResolver('organizationService'))
  );
  const permissionRoutes = PermissionRoutes(
    PermissionController(ci.scopedResolver('permissionService'))
  );
  const roleRoutes = RoleRoutes(
    RoleController(ci.scopedResolver('roleService'))
  );
  const userRoutes = UserRoutes(
    UserController(ci.scopedResolver('userService'))
  );

  app.use(organizationRoutes.router);
  app.use(permissionRoutes.router);
  app.use(roleRoutes.router);
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
