import { Collection } from '@mikro-orm/core';

export type MapNestedDtoArraysToCollections<Dto, Keys extends string> = Omit<
  Dto,
  Keys
> & {
  [K in Keys]: Collection<object>;
};
