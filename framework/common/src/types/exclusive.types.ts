export type ExclusiveRecord<T, U> = T extends object
  ? U extends object
    ? T & Record<Exclude<keyof T, keyof U>, never>
    : T
  : T;
