import { serviceSchemaResolver } from '@forklaunch/internal';
import { BaseReviewServiceSchemas as TypeBoxSchemas } from './typebox/review.schema';
import { BaseReviewServiceSchemas as ZodSchemas } from './zod/review.schema';

export const BaseReviewServiceSchemas = serviceSchemaResolver(
  TypeBoxSchemas,
  ZodSchemas
);
