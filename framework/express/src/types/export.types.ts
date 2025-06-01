import { Express } from 'express-serve-static-core';
import { ParsedQs } from 'qs';

export type SetQsAndStaticTypes<T extends ParsedQs, U extends Express> = {
  qs: T;
  express: U;
};
