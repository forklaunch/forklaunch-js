import { forklaunchRouter, schemaValidator } from '@forklaunch/blueprint-core';
import { ci, tokens } from '../../bootstrapper';
import {
  createOrganization,
  deleteOrganization,
  getOrganization,
  updateOrganization
} from '../controllers/organization.controller';

const openTelemetryCollector = ci.resolve(tokens.OpenTelemetryCollector);

export const organizationRouter = forklaunchRouter(
  '/organization',
  schemaValidator,
  openTelemetryCollector
);

organizationRouter.post('/', createOrganization);
organizationRouter.get('/:id', getOrganization);
organizationRouter.put('/', updateOrganization);
organizationRouter.delete('/:id', deleteOrganization);
