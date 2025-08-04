import { sdkClient } from "@forklaunch/core/http";
import { schemaValidator } from "./registrations";
import { {{camel_case_name}}SdkRouter } from "./api/routes/{{camel_case_name}}.routes";

export const {{pascal_case_name}}Sdk = sdkClient(schemaValidator, {
  {{camel_case_name}}: {{camel_case_name}}SdkRouter
});