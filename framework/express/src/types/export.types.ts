import { Express } from 'express-serve-static-core';
import { ParsedQs } from 'qs';
import { Range } from 'range-parser';

export type SetExportTypes<
  T extends ParsedQs,
  U extends Express,
  V extends Range
> = {
  qs: T;
  express: U;
  rangeParser: V;
};
