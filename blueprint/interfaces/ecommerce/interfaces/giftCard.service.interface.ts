import { EntityManager } from '@mikro-orm/core';
import { GiftCardServiceParameters } from '../types/giftCard.service.types';

export interface GiftCardService<
  Params extends GiftCardServiceParameters = GiftCardServiceParameters
> {
  createGiftCard: (
    giftCardDto: Params['CreateGiftCardDto'],
    em?: EntityManager
  ) => Promise<Params['GiftCardDto']>;
  getGiftCard: (
    idDto: Params['IdDto'],
    em?: EntityManager
  ) => Promise<Params['GiftCardDto']>;
  listGiftCards: (
    idsDto?: Params['IdsDto'],
    em?: EntityManager
  ) => Promise<Params['GiftCardDto'][]>;
  /** Atomic, conditional balance decrement — never a read-then-write. */
  redeemGiftCard: (
    redeemDto: Params['RedeemGiftCardDto'],
    em?: EntityManager
  ) => Promise<Params['GiftCardRedemptionResultDto']>;
}
