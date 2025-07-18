
{{#is_iam}}import type { IamSdkClient{{#is_better_auth}}, BetterAuthConfig{{/is_better_auth}} } from "@{{app_name}}/iam";{{/is_iam}}{{#is_billing}}
import type { BillingSdkClient } from "@{{app_name}}/billing";{{/is_billing}}
import { universalSdk } from "@forklaunch/universal-sdk";{{#is_better_auth}}
import { createAuthClient } from "better-auth/client";{{/is_better_auth}}
{{#is_better_auth}}import { inferAdditionalFields } from 'better-auth/client/plugins';{{/is_better_auth}}
//! exportable function for creating a universal SDK instance for use in browser and server environments
export const {{camel_case_app_name}}UniversalSdk = async ({
  iamHost,
  billingHost,
}: { {{#is_iam}}
  iamHost: string;{{/is_iam}}{{#is_billing}}
  billingHost: string;{{/is_billing}}
}): Promise<{ {{#is_iam}}
  iam: {{^is_better_auth}}IamSdkClient{{/is_better_auth}}{{#is_better_auth}}
  { 
    betterAuth: ReturnType<typeof createAuthClient>,
    {{camel_case_app_name}}: IamSdkClient
  }{{/is_better_auth}};{{/is_iam}}{{#is_billing}}
  billing: BillingSdkClient;{{/is_billing}}
}> => ({
  {{#is_iam}}iam: {{^is_better_auth}}await universalSdk<IamSdkClient>({
    host: iamHost,
    registryOptions: {
      path: 'api/v1/openapi',
    },
  }){{/is_better_auth}}{{#is_better_auth}}{
    betterAuth: createAuthClient({
      baseURL: iamBetterAuthHost,
      plugins: [inferAdditionalFields<BetterAuthConfig>()]
    }),
    {{camel_case_app_name}}: await universalSdk<IamSdkClient>({
      host: iamHost,
      registryOptions: {
        path: "api/v1/openapi",
      },
    }),
  }{{/is_better_auth}},{{/is_iam}}
  {{#is_billing}}billing: await universalSdk<BillingSdkClient>({
    host: billingHost,
    registryOptions: {
      path: "api/v1/openapi",
    },
  }),{{/is_billing}}
});
