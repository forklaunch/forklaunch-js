import { EntityManager } from '@mikro-orm/core';
import { PromoCodeServiceParameters } from '../types/promoCode.service.types';

export interface PromoCodeService<
  Params extends PromoCodeServiceParameters = PromoCodeServiceParameters
> {
  createPromoCode: (
    promoCodeDto: Params['CreatePromoCodeDto'],
    em?: EntityManager
  ) => Promise<Params['PromoCodeDto']>;
  getPromoCode: (
    idDto: Params['IdDto'],
    em?: EntityManager
  ) => Promise<Params['PromoCodeDto']>;
  listPromoCodes: (
    idsDto?: Params['IdsDto'],
    em?: EntityManager
  ) => Promise<Params['PromoCodeDto'][]>;
  updatePromoCode: (
    promoCodeDto: Params['UpdatePromoCodeDto'],
    em?: EntityManager
  ) => Promise<Params['PromoCodeDto']>;
  deletePromoCode: (idDto: Params['IdDto'], em?: EntityManager) => Promise<void>;
  /** Validates AND atomically consumes one redemption in the same DB
   *  operation — a promo code is "spent" the moment checkout uses it, not
   *  previewed separately. Never a read-then-write: the increment is
   *  conditional on remaining usage in the same query. */
  redeemPromoCode: (
    redeemDto: Params['RedeemPromoCodeDto'],
    em?: EntityManager
  ) => Promise<Params['PromoCodeRedemptionResultDto']>;
}
