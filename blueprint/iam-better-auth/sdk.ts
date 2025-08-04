import { schemaValidator } from '@forklaunch/blueprint-core';
import { sdkClient } from '@forklaunch/core/http';
import { organizationSdkRouter } from './api/routes/organization.routes';
import { permissionSdkRouter } from './api/routes/permission.routes';
import { roleSdkRouter } from './api/routes/role.routes';
import { userSdkRouter } from './api/routes/user.routes';

//! creates an instance of the sdkClient
export const IamSdkClient = sdkClient(schemaValidator, {
  organization: organizationSdkRouter,
  permission: permissionSdkRouter,
  role: roleSdkRouter,
  user: userSdkRouter
});
