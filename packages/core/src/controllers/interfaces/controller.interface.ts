export type Controller<Service> = {
  [K in keyof Service]: unknown;
};
