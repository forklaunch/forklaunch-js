import { OpenTelemetryCollector } from '@forklaunch/core/http';
import { ConfigInjector, ScopedDependencyFactory } from '@forklaunch/core/services';
import { forklaunchRouter, SchemaValidator } from '@{{app_name}}/core';
import { Metrics } from '@{{app_name}}/monitoring';
import { configValidator } from '../bootstrapper';
import { {{pascal_case_name}}Controller } from '../controllers/{{camel_case_name}}.controller';

// returns an object with the router and the {{camel_case_name}}Get and {{camel_case_name}}Post methods for easy installation
export const {{pascal_case_name}}Routes = (
  scopeFactory: () => ConfigInjector<SchemaValidator, typeof configValidator>,
  scopedServiceFactory: ScopedDependencyFactory<
    SchemaValidator,
    typeof configValidator,
    '{{camel_case_name}}Service'
  >,
  openTelemetryCollector: OpenTelemetryCollector<Metrics>
) => {
  // defines the router for the {{camel_case_name}} routes
  const router = forklaunchRouter('/{{kebab_case_name}}', openTelemetryCollector);

  const controller = new {{pascal_case_name}}Controller(
    scopeFactory,
    scopedServiceFactory,
    openTelemetryCollector
  );

  return {
    router,

    {{camel_case_name}}Get: router.get('/', controller.{{camel_case_name}}Get),
    {{camel_case_name}}Post: router.post('/', controller.{{camel_case_name}}Post)
  };
};
