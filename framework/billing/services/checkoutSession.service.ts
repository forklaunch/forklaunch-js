import { TtlCache } from '@forklaunch/core/cache';
import { SchemaValidator } from '@forklaunch/framework-core';
import { v4 } from 'uuid';
import { CheckoutSessionService } from '../interfaces/checkoutSession.service.interface';
import {
  CreateSessionDto,
  CreateSessionDtoMapper,
  SessionDto,
  SessionDtoMapper
} from '../models/dtoMapper/session.dtoMapper';
import { Session } from '../models/persistence/session.entity';

export class BaseCheckoutSessionService implements CheckoutSessionService {
  constructor(private cache: TtlCache) {}

  // TODO: move this into core
  private cacheKeyPrefix = 'checkout_session';

  private createCacheKey(id: string): string {
    return `${this.cacheKeyPrefix}:${id}`;
  }

  async createCheckoutSession(
    sessionDto: CreateSessionDto
  ): Promise<SessionDto> {
    const session = CreateSessionDtoMapper.deserializeDtoToEntity(
      SchemaValidator(),
      sessionDto
    );
    session.id = v4();

    // Store the session details in the cache
    await this.cache.putRecord({
      key: `checkout_session_${session.id}`,
      value: session,
      ttlMilliseconds: this.cache.getTtlMilliseconds()
    });
    const cachedSessionDetails = await this.cache.readRecord<Session>(
      `checkout_session_${session.id}`
    );
    const createdSessionDto = SessionDtoMapper.serializeEntityToDto(
      SchemaValidator(),
      cachedSessionDetails.value
    );
    return createdSessionDto;
  }

  async getCheckoutSession(id: string): Promise<SessionDto> {
    const sessionDetails = await this.cache.readRecord<Session>(
      `checkout_session_${id}`
    );
    if (!sessionDetails) {
      throw new Error('Session not found');
    }
    return sessionDetails.value;
  }

  async expireCheckoutSession(id: string): Promise<void> {
    const sessionDetails = await this.cache.readRecord(
      `checkout_session_${id}`
    );
    if (!sessionDetails) {
      throw new Error('Session not found');
    }
    await this.cache.deleteRecord(`checkout_session_${id}`);
  }

  async handleCheckoutSuccess(id: string): Promise<void> {
    // TODO: add log here to make sure that this action is recorded
    await this.cache.deleteRecord(`checkout_session_${id}`);
  }

  async handleCheckoutFailure(id: string): Promise<void> {
    // TODO: add log here to make sure that this action is recorded
    await this.cache.deleteRecord(`checkout_session_${id}`);
  }
}
