import {
  CreateSessionDto,
  SessionDto
} from '../models/dtoMapper/session.dtoMapper';

export interface CheckoutSessionService {
  // for generating external links
  // store in cache, for permissions
  createCheckoutSession: (sessionDto: CreateSessionDto) => Promise<SessionDto>;
  getCheckoutSession: (id: string) => Promise<SessionDto>;
  expireCheckoutSession: (id: string) => Promise<void>;

  handleCheckoutSuccess: (id: string) => Promise<void>;
  handleCheckoutFailure: (id: string) => Promise<void>;
}
