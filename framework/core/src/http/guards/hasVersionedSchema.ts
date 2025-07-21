export function hasVersionedSchema(contractDetails: unknown) {
  return (
    typeof contractDetails === 'object' &&
    contractDetails !== null &&
    'versions' in contractDetails &&
    contractDetails.versions !== null
  );
}
