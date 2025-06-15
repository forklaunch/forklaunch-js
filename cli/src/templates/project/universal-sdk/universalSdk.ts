
{{#is_iam}}import type { IamApiClient } from "@{{app_name}}/iam";{{/is_iam}}{{#is_billing}}
import type { BillingApiClient } from "@{{app_name}}/billing";{{/is_billing}}
import { universalSdk } from "@forklaunch/universal-sdk";{{#is_better_auth}}
import { createAuthClient } from "better-auth/client";{{/is_better_auth}}
//! exportable function for creating a universal SDK instance for use in browser and server environments
export const {{camel_case_app_name}}UniversalSdk = async ({
  iamHost,
  billingHost,
}: {
  iamHost: string;
  billingHost: string;
})=> ({
  {{#is_iam}}iam: {{^is_better_auth}}await universalSdk<IamApiClient>({
    host: iamHost,
    registryOptions: {
      path: 'api/v1/openapi',
    },
  }){{/is_better_auth}}{{#is_better_auth}}{
    betterAuth: createAuthClient({
      baseURL: iamBetterAuthHost,
    }),
    {{camel_case_app_name}}: await universalSdk<IamApiClient>({
      host: iamHost,
      registryOptions: {
        path: "api/v1/openapi",
      },
    }),
  }{{/is_better_auth}},{{/is_iam}}
  {{#is_billing}}billing: await universalSdk<BillingApiClient>({
    host: billingHost,
    registryOptions: {
      path: "api/v1/openapi",
    },
  }),{{/is_billing}}
});
