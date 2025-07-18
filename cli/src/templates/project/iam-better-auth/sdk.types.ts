/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  SdkClient,
  UnpackSdkClientInput,
  ValidSdkClientInput,
} from "@forklaunch/core/http";
import {
  organizationRoutes,
  permissionRoutes,
  roleRoutes,
  userRoutes,
} from "./server";

type IamClientSdkInput = {
  organization: typeof organizationRoutes;
  permission: typeof permissionRoutes;
  role: typeof roleRoutes;
  user: typeof userRoutes;
};

type UnpackedIamClientSdkInput = UnpackSdkClientInput<IamClientSdkInput>;

type ValidatedIamClientSdkInput =
  ValidSdkClientInput<UnpackedIamClientSdkInput>;

export type IamSdkClient = SdkClient<IamClientSdkInput>;
