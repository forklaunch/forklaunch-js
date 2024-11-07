import { ApiClient } from '@forklaunch/core/http';
import { forklaunchExpress } from '@forklaunch/framework-core';
import { bootstrap } from './bootstrapper';
import { OrganizationRoutes } from './routes/organization.routes';
import { PermissionRoutes } from './routes/permission.routes';
import { RoleRoutes } from './routes/role.routes';
import { UserRoutes } from './routes/user.routes';

const app = forklaunchExpress();
const port = Number(process.env.PORT) || 8000;

bootstrap((ci) => {
  const scopedOrganizationServiceResolver = ci.scopedResolver(
    'organizationService'
  );
  const scopedPermissionServiceResolver =
    ci.scopedResolver('permissionService');
  const scopedRoleServiceResolver = ci.scopedResolver('roleService');
  const scopedUserServiceResolver = ci.scopedResolver('userService');

  const organizationRoutes = OrganizationRoutes(
    scopedOrganizationServiceResolver
  );
  const permissionRoutes = PermissionRoutes(
    ci.createScope,
    scopedPermissionServiceResolver,
    scopedRoleServiceResolver
  );
  const roleRoutes = RoleRoutes(scopedRoleServiceResolver);
  const userRoutes = UserRoutes(
    ci.createScope,
    scopedUserServiceResolver,
    scopedOrganizationServiceResolver,
    scopedRoleServiceResolver
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
