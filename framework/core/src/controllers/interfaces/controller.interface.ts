/**
 * Generic interface for a controller that wraps a service.
 *
 * @template Service - The service type that this controller wraps
 *
 */
export type Controller<Service> = {
  [K in keyof Service]: unknown;
} & {
  [K: string]: unknown;
};
