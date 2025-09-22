import { mikroOrmAdapter } from '@forklaunch/better-auth-mikro-orm-fork';
import { Metrics } from '@forklaunch/blueprint-monitoring';
import { OpenTelemetryCollector } from '@forklaunch/core/http';
import { MikroORM } from '@mikro-orm/core';
import { betterAuth, BetterAuthOptions } from 'better-auth';
import { openAPI } from 'better-auth/plugins';

type Plugins = [ReturnType<typeof openAPI>];
const plugins: Plugins = [
  openAPI({
    disableDefaultReference: true
  })
];

export const betterAuthConfig = ({
  BETTER_AUTH_BASE_PATH,
  PASSWORD_ENCRYPTION_SECRET,
  CORS_ORIGINS,
  orm,
  openTelemetryCollector
}: {
  BETTER_AUTH_BASE_PATH: string;
  PASSWORD_ENCRYPTION_SECRET: string;
  CORS_ORIGINS: string[];
  orm: MikroORM;
  openTelemetryCollector: OpenTelemetryCollector<Metrics>;
}) =>
  ({
    basePath: BETTER_AUTH_BASE_PATH,
    secret: PASSWORD_ENCRYPTION_SECRET,
    trustedOrigins: CORS_ORIGINS,
    database: mikroOrmAdapter(orm),
    emailAndPassword: {
      enabled: true
    },
    plugins,
    user: {
      additionalFields: {
        firstName: {
          type: 'string',
          required: true
        },
        lastName: {
          type: 'string',
          required: true
        },
        phoneNumber: {
          type: 'string',
          required: false
        },
        organizationId: {
          type: 'string',
          required: false,
          returned: true
        },
        roleIds: {
          type: 'string[]',
          required: false,
          returned: true
        },
        organization: {
          type: 'string',
          required: false,
          returned: false
        },
        roles: {
          type: 'string[]',
          required: false,
          returned: false
        }
      }
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user, ctx) => {
            return {
              data: {
                ...user,
                ...(ctx?.body.organization || ctx?.body.organizationId
                  ? {
                      organization: {
                        $in: [
                          ctx?.body.organizationId || ctx?.body.organization
                        ]
                      }
                    }
                  : {}),
                ...(ctx?.body.roleIds || ctx?.body.roles
                  ? {
                      roles: {
                        $in: ctx?.body.roleIds || ctx?.body.roles
                      }
                    }
                  : {})
              }
            };
          }
        }
      }
    },
    advanced: {
      database: {
        generateId: false
      }
    },
    logger: openTelemetryCollector
  }) satisfies BetterAuthOptions;

export type BetterAuth = ReturnType<
  typeof betterAuth<ReturnType<typeof betterAuthConfig>>
>;
