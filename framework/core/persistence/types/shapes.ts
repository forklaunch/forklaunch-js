export type CreateShape<BaseEntity, T> = {
  [K in keyof Omit<T, keyof BaseEntity>]: T[K];
};

export type UpdateShape<BaseEntity, T> = Partial<
  CreateShape<BaseEntity, T> & { id: string }
>;
