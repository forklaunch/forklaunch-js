import { ResponseCompiledSchema } from '../types/contractDetails.types';

export function isResponseCompiledSchema(
  schema: unknown
): schema is ResponseCompiledSchema {
  return typeof schema === 'object' && schema !== null && 'responses' in schema;
}
