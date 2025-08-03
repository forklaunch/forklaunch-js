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

export const organizationRouter = forklaunchRouter(
  '/organization',
  schemaValidator,
  openTelemetryCollector
);

const controller = OrganizationController(
  organizationServiceFactory,
  openTelemetryCollector
);

organizationRouter.post('/', controller.createOrganization);
organizationRouter.get('/:id', controller.getOrganization);
organizationRouter.put('/', controller.updateOrganization);
organizationRouter.delete('/:id', controller.deleteOrganization);

export const organizationSdkRouter = sdkRouter(
  schemaValidator,
  controller,
  organizationRouter
);
