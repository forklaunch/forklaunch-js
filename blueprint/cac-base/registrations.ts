import {
  number,
  optional,
  schemaValidator,
  string
} from '@forklaunch/blueprint-core';
import { Metrics, metrics } from '@forklaunch/blueprint-monitoring';
import { OpenTelemetryCollector } from '@forklaunch/core/http';
import { wrapEmWithTenantContext } from '@forklaunch/core/persistence';
import {
  ComplianceDataService,
  createConfigInjector,
  getEnvVar,
  Lifetime,
  RetentionService
} from '@forklaunch/core/services';
import {
  MockProcedureCodeProvider,
  ScrubbingService
} from '@forklaunch/implementation-cac-base/services';
import { ForkOptions } from '@mikro-orm/core';
import { EntityManager, MikroORM } from '@mikro-orm/postgresql';
import mikroOrmOptionsConfig from './mikro-orm.config';
import { ClaimService } from './services/claim.service';
import { CodeValidationService } from './services/codeValidation.service';

//! defines the configuration schema for the application
const configInjector = createConfigInjector(schemaValidator, {
  SERVICE_METADATA: {
    lifetime: Lifetime.Singleton,
    type: {
      name: string,
      version: string
    },
    value: {
      name: 'cac',
      version: '0.1.0'
    }
  }
});

//! defines the environment configuration for the application
const environmentConfig = configInjector.chain({
  HOST: {
    lifetime: Lifetime.Singleton,
    type: string,
    value: getEnvVar('HOST')
  },
  PORT: {
    lifetime: Lifetime.Singleton,
    type: number,
    value: Number(getEnvVar('PORT'))
  },
  VERSION: {
    lifetime: Lifetime.Singleton,
    type: optional(string),
    value: getEnvVar('VERSION') ?? 'v1'
  },
  DOCS_PATH: {
    lifetime: Lifetime.Singleton,
    type: optional(string),
    value: getEnvVar('DOCS_PATH') ?? '/docs'
  },
  OTEL_SERVICE_NAME: {
    lifetime: Lifetime.Singleton,
    type: string,
    value: getEnvVar('OTEL_SERVICE_NAME')
  },
  OTEL_LEVEL: {
    lifetime: Lifetime.Singleton,
    type: optional(string),
    value: getEnvVar('OTEL_LEVEL') ?? 'info'
  },
  OTEL_EXPORTER_OTLP_ENDPOINT: {
    lifetime: Lifetime.Singleton,
    type: string,
    value: getEnvVar('OTEL_EXPORTER_OTLP_ENDPOINT')
  },
  HMAC_SECRET_KEY: {
    lifetime: Lifetime.Singleton,
    type: string,
    value: getEnvVar('HMAC_SECRET_KEY')
  },
  JWKS_PUBLIC_KEY_URL: {
    lifetime: Lifetime.Singleton,
    type: string,
    value: getEnvVar('JWKS_PUBLIC_KEY_URL')
  },
  IAM_URL: {
    lifetime: Lifetime.Singleton,
    type: string,
    value: getEnvVar('IAM_URL')
  },
  ENCRYPTION_KEY: {
    lifetime: Lifetime.Singleton,
    type: string,
    value: getEnvVar('ENCRYPTION_KEY')
  }
});

//! defines the runtime dependencies for the application
const runtimeDependencies = environmentConfig.chain({
  Orm: {
    lifetime: Lifetime.Singleton,
    type: MikroORM,
    factory: () => new MikroORM(mikroOrmOptionsConfig)
  },
  OtelCollector: {
    lifetime: Lifetime.Singleton,
    type: OpenTelemetryCollector<Metrics>,
    factory: ({ OTEL_SERVICE_NAME, OTEL_LEVEL }) =>
      new OpenTelemetryCollector(
        OTEL_SERVICE_NAME,
        OTEL_LEVEL || 'info',
        metrics
      )
  },
  EntityManager: {
    lifetime: Lifetime.Scoped,
    type: EntityManager,
    factory: (
      { Orm },
      context: { entityManagerOptions?: ForkOptions; tenantId?: string }
    ) =>
      wrapEmWithTenantContext(
        Orm.em.fork(context?.entityManagerOptions),
        context?.tenantId
      ) as EntityManager
  }
});

//! defines the service dependencies for the application
const serviceDependencies = runtimeDependencies.chain({
  CodeSetProvider: {
    lifetime: Lifetime.Singleton,
    type: MockProcedureCodeProvider,
    // Every org resolves to the free mock provider until the phase 2
    // feature gate (§5) reads CodeSetLicense and swaps in a real connector
    // for organizations that have wired one up. See plan/cac/ §5.
    factory: ({ OtelCollector }) => new MockProcedureCodeProvider(OtelCollector)
  },
  CodeValidationService: {
    lifetime: Lifetime.Scoped,
    type: CodeValidationService,
    factory: ({ EntityManager, OtelCollector }) =>
      new CodeValidationService(EntityManager, OtelCollector)
  },
  ScrubbingService: {
    lifetime: Lifetime.Singleton,
    type: ScrubbingService,
    factory: () => new ScrubbingService()
  },
  ClaimService: {
    lifetime: Lifetime.Scoped,
    type: ClaimService,
    factory: ({ EntityManager, ScrubbingService, OtelCollector }) =>
      new ClaimService(EntityManager, ScrubbingService, OtelCollector)
  },
  ComplianceDataService: {
    lifetime: Lifetime.Singleton,
    type: ComplianceDataService,
    // Erase/export requests are keyed by the Patient record itself — the
    // three entities below are the only ones with a *direct* field back to
    // a patient id. Diagnosis/Charge/Remittance/Denial only reach a patient
    // by walking through Encounter/Claim, which the framework's generic
    // compliance service doesn't cascade through (single-hop by design) —
    // out of scope for this phase, tracked in plan/cac/ §12 if it needs
    // solving later.
    factory: ({ Orm, OtelCollector }) =>
      new ComplianceDataService(Orm, OtelCollector, {
        Patient: 'id',
        Insurance: 'patient',
        Encounter: 'patient',
        Claim: 'patient'
      })
  },
  RetentionService: {
    lifetime: Lifetime.Singleton,
    type: RetentionService,
    factory: ({ Orm, OtelCollector }) =>
      new RetentionService(Orm, OtelCollector)
  }
});

//! validates the configuration and returns the dependencies for the application
export const createDependencyContainer = (envFilePath: string) => ({
  ci: serviceDependencies.validateConfigSingletons(envFilePath),
  tokens: serviceDependencies.tokens()
});
