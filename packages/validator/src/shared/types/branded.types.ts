export type Uuid = `${string}-${string}-${string}-${string}-${string}`;
export type PhoneNumber = `${string}${string}-${string}`;

export type AppliedBrand<T> = T extends { __brand: infer Brand }
  ? Brand extends 'Uuid'
    ? Uuid
    : Brand extends 'PhoneNumber'
      ? PhoneNumber
      : T
  : T;
