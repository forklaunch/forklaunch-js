import { IdDto, IdsDto, RecordTimingDto } from '@forklaunch/common';

export type CreateGiftCardDto = Partial<IdDto> & {
  code: string;
  initialCents: number;
  currency: string;
};

export type GiftCardDto = CreateGiftCardDto &
  IdDto &
  Partial<RecordTimingDto> & {
    balanceCents: number;
  };

export type RedeemGiftCardDto = {
  code: string;
  /** The most this redemption is allowed to draw (e.g. the order total) —
   *  a gift card never covers more than what's actually owed. */
  requestedCents: number;
};

export type GiftCardRedemptionResultDto = {
  valid: boolean;
  reason?: string;
  /** min(requestedCents, remaining balance) — partial redemption allowed. */
  appliedCents: number;
};

export type GiftCardServiceParameters = {
  CreateGiftCardDto: CreateGiftCardDto;
  GiftCardDto: GiftCardDto;
  RedeemGiftCardDto: RedeemGiftCardDto;
  GiftCardRedemptionResultDto: GiftCardRedemptionResultDto;
  IdDto: IdDto;
  IdsDto: IdsDto;
};
