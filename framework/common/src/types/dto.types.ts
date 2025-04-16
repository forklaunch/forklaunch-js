/**
 * Type representing a DTO (Data Transfer Object) with an id field.
 */
export type IdDto = {
  id: string;
};

/**
 * Type representing a DTO with an array of ids.
 */
export type IdsDto = {
  ids: string[];
};

/**
 * Type representing a DTO with timing information (created and updated timestamps).
 */
export type RecordTimingDto = {
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Type that creates a record of return types from a record of functions.
 *
 * @template T - A record type where each value is a function
 * @example
 * type Functions = {
 *   getName: () => string;
 *   getAge: () => number;
 * };
 * type ReturnTypes = ReturnTypeRecord<Functions>; // { getName: string; getAge: number; }
 */
export type ReturnTypeRecord<
  T extends Record<string, (...args: never[]) => unknown>
> = {
  [K in keyof T]: ReturnType<T[K]>;
};

/**
 * Type that creates a record of instance types from a record of constructors.
 *
 * @template T - A record type where each value is a constructor
 * @example
 * type Constructors = {
 *   User: new () => User;
 *   Post: new () => Post;
 * };
 * type InstanceTypes = InstanceTypeRecord<Constructors>; // { User: User; Post: Post; }
 */
export type InstanceTypeRecord<
  T extends Record<string, new (...args: never[]) => unknown>
> = {
  [K in keyof T]: InstanceType<T[K]>;
};
