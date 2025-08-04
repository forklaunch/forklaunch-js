import { sdkClient } from "@forklaunch/core/http";
import { schemaValidator } from "@{{app_name}}/core";
import { {{camel_case_name}}SdkRouter } from "./api/routes/{{camel_case_name}}.routes";

export const {{pascal_case_name}}SdkClient = sdkClient(schemaValidator, {
  {{camel_case_name}}: {{camel_case_name}}SdkRouter
});