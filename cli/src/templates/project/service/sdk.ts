import { sdkClient } from "@forklaunch/core/http";
import { schemaValidator } from "@{{app_name}}/core";
import { {{camel_case_name}}SdkRouter } from "./api/routes/{{camel_case_name}}.routes";

//! creates an instance of the sdkClient
export const {{camel_case_name}}SdkClient = sdkClient(schemaValidator, {
  {{camel_case_name}}: {{camel_case_name}}SdkRouter
});
export type {{pascal_case_name}}SdkClient = typeof {{camel_case_name}}SdkClient;