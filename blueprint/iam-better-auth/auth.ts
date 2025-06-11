import { mikroOrmAdapter } from '@forklaunch/better-auth-mikro-orm-fork';
import { Metrics } from '@forklaunch/blueprint-monitoring';
import { OpenTelemetryCollector } from '@forklaunch/core/http';
import { MikroORM } from '@mikro-orm/core';
import { BetterAuthOptions } from 'better-auth';
import { openAPI } from 'better-auth/plugins';
import { readFileSync } from 'fs';

export type BetterAuthConfig = ReturnType<typeof betterAuthConfig>;
export const betterAuthConfig = ({
  BETTER_AUTH_BASE_PATH,
  PASSWORD_ENCRYPTION_SECRET_PATH,
  CORS_ORIGINS,
  orm,
  openTelemetryCollector
}: {
  BETTER_AUTH_BASE_PATH: string;
  PASSWORD_ENCRYPTION_SECRET_PATH: string;
  CORS_ORIGINS: string[];
  orm: MikroORM;
  openTelemetryCollector: OpenTelemetryCollector<Metrics>;
}) =>
  ({
    basePath: BETTER_AUTH_BASE_PATH,
    secret: readFileSync(PASSWORD_ENCRYPTION_SECRET_PATH, 'utf8').split(
      '\n'
    )[1],
    trustedOrigins: CORS_ORIGINS,
    database: mikroOrmAdapter(orm),
    emailAndPassword: {
      enabled: true
    },
    plugins: [
      openAPI({
        disableDefaultReference: true
      })
    ],
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
        roleIds: {
          type: 'string[]',
          required: false,
          input: false
        },
        organizationId: {
          type: 'string',
          required: false,
          input: false
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
                organization: {
                  $in: ctx?.body.organizationId
                    ? [ctx?.body.organizationId]
                    : []
                },
                roles: {
                  $in: ctx?.body.roleIds ? ctx?.body.roleIds : []
                }
              }
            };
          }
        }
      }
    },
    advanced: {
      generateId: false
    },
    logger: openTelemetryCollector
  }) satisfies BetterAuthOptions;
