import { EntityManager } from '@mikro-orm/core';

/**
 * Interface representing a base service.
 *
 * @interface BaseService
 */
export interface BaseService {
  /**
   * The EntityManager instance for managing entities.
   *
   * @type {EntityManager}
   */
  em: EntityManager;
}
