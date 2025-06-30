export type UnionToIntersection<U> = (
  U extends unknown ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never;

export type UnionToIntersectionChildren<U> = {
  [K in keyof U]: UnionToIntersection<U[K]>;
};
