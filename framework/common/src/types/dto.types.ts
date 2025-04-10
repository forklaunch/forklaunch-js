export type IdDto = {
  id: string;
};

export type IdsDto = {
  ids: string[];
};

export type RecordTimingDto = {
  createdAt: Date;
  updatedAt: Date;
};

export type ReturnTypeRecord<
  T extends Record<string, (...args: never[]) => unknown>
> = {
  [K in keyof T]: ReturnType<T[K]>;
};

export type InstanceTypeRecord<
  T extends Record<string, new (...args: never[]) => unknown>
> = {
  [K in keyof T]: InstanceType<T[K]>;
};
