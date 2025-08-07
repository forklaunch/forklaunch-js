import { ZodType } from '@forklaunch/validator/zod';

export function isUnionable(
  schema: ZodType[]
): schema is [ZodType, ZodType, ...ZodType[]] {
  return schema.length > 1;
}
