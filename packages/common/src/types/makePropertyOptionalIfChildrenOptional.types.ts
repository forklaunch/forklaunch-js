type AllPropertiesOptional<T> = T extends Partial<T>
  ? Partial<T> extends T
    ? true
    : false
  : false;

export type MakePropertyOptionalIfChildrenOptional<T> = {
  [K in keyof T as AllPropertiesOptional<T[K]> extends true ? K : never]?: T[K];
} & {
  [K in keyof T as AllPropertiesOptional<T[K]> extends true ? never : K]: T[K];
};
