export type RemoveTrailingSlash<T extends string> = T extends `${infer Route}/`
  ? Route
  : T;
