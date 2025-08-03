import { forklaunchRouter, SchemaValidator } from '@forklaunch/blueprint-core';
import { sdkRouter } from '@forklaunch/core/http';
import { ci, tokens } from '../../server';
import { OrganizationController } from '../controllers/organization.controller';

const schemaValidator = SchemaValidator();
const openTelemetryCollector = ci.resolve(tokens.OpenTelemetryCollector);
const organizationServiceFactory = ci.scopedResolver(
  tokens.OrganizationService
);

export type OrganizationServiceFactory = typeof organizationServiceFactory;

export const organiztionRouter = forklaunchRouter(
  '/organization',
  schemaValidator,
  openTelemetryCollector
);

const controller = OrganizationController(
  organizationServiceFactory,
  openTelemetryCollector
);

organiztionRouter.post('/', controller.createOrganization);
organiztionRouter.get('/:id', controller.getOrganization);
organiztionRouter.put('/', controller.updateOrganization);
organiztionRouter.delete('/:id', controller.deleteOrganization);

export const organizationSdkRouter = sdkRouter(
  schemaValidator,
  controller,
  organiztionRouter
);
