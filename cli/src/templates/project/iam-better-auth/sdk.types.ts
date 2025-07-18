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

type IamSdkClientInput = {
  organization: typeof organizationRoutes;
  permission: typeof permissionRoutes;
  role: typeof roleRoutes;
  user: typeof userRoutes;
};

type UnpackedIamSdkClientInput = UnpackSdkClientInput<IamSdkClientInput>;

type ValidatedIamSdkClientInput =
  ValidSdkClientInput<UnpackedIamSdkClientInput>;

export type IamSdkClient = SdkClient<IamSdkClientInput>;
