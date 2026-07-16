import { IdDto, IdsDto, RecordTimingDto } from '@forklaunch/common';

export const PromoCodeType = {
  PERCENT: 'percent',
  FIXED: 'fixed',
  FREE_SHIPPING: 'free_shipping'
} as const;

export type PromoCodeTypeType = (typeof PromoCodeType)[keyof typeof PromoCodeType];

export type CreatePromoCodeDto = Partial<IdDto> & {
  code: string;
  type: PromoCodeTypeType;
  /** Percent (0-100) for PERCENT, cents for FIXED, ignored (0) for FREE_SHIPPING. */
  value: number;
  maxRedemptions?: number;
  minSubtotalCents?: number;
  expiresAt?: Date;
};

export type UpdatePromoCodeDto = Partial<IdDto> & {
  id: string;
  active?: boolean;
};

export type PromoCodeDto = CreatePromoCodeDto &
  IdDto &
  Partial<RecordTimingDto> & {
    timesRedeemed: number;
    active: boolean;
  };

export type RedeemPromoCodeDto = {
  code: string;
  subtotalCents: number;
};

/** never below zero (ECOM-11) enforced by the caller using discountCents. */
export type PromoCodeRedemptionResultDto = {
  valid: boolean;
  reason?: string;
  discountCents: number;
  freeShipping: boolean;
};

export type PromoCodeServiceParameters = {
  CreatePromoCodeDto: CreatePromoCodeDto;
  UpdatePromoCodeDto: UpdatePromoCodeDto;
  PromoCodeDto: PromoCodeDto;
  RedeemPromoCodeDto: RedeemPromoCodeDto;
  PromoCodeRedemptionResultDto: PromoCodeRedemptionResultDto;
  IdDto: IdDto;
  IdsDto: IdsDto;
};
