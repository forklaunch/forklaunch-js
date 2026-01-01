/**
 * Integration tests for BaseEntity.update() partial update functionality
 *
 * These tests validate that partial updates preserve all fields that are not
 * included in the update DTO, fixing the issue where em.merge() would lose fields.
 *
 */

import { EntityManager, PrimaryKey, Property } from '@mikro-orm/core';
import { v4 } from 'uuid';
import { describe, expect, it, vi } from 'vitest';
import { BaseEntity } from '../src/persistence/base.entity';

// Test entity for partial update validation
// Note: @Entity() decorator not needed since we're using mocked EntityManager
// Decorator type errors are false positives - decorators work correctly at runtime
class TestUser extends BaseEntity {
  // @ts-expect-error - MikroORM decorator type resolution issue in test files
  @PrimaryKey({ type: 'uuid' })
  id: string = v4();

  // @ts-expect-error - MikroORM decorator type resolution issue in test files
  @Property()
  email!: string;

  // @ts-expect-error - MikroORM decorator type resolution issue in test files
  @Property()
  firstName!: string;

  // @ts-expect-error - MikroORM decorator type resolution issue in test files
  @Property()
  lastName!: string;

  // @ts-expect-error - MikroORM decorator type resolution issue in test files
  @Property({ nullable: true })
  phoneNumber?: string;

  // @ts-expect-error - MikroORM decorator type resolution issue in test files
  @Property({ nullable: true })
  bio?: string;

  // @ts-expect-error - MikroORM decorator type resolution issue in test files
  @Property()
  createdAt: Date = new Date();

  // @ts-expect-error - MikroORM decorator type resolution issue in test files
  @Property()
  updatedAt: Date = new Date();
}

describe('BaseEntity.update() - Partial Update Tests', () => {
  describe('Partial update behavior', () => {
    it('should preserve all fields when updating only email', async () => {
      // Create a full user entity (simulating what's in the database)
      const userId = v4();
      const existingUser = new TestUser();
      existingUser.id = userId;
      existingUser.email = 'john.doe@example.com';
      existingUser.firstName = 'John';
      existingUser.lastName = 'Doe';
      existingUser.phoneNumber = '+1234567890';
      existingUser.bio = 'Software engineer';
      existingUser.createdAt = new Date('2024-01-01');
      existingUser.updatedAt = new Date('2024-01-01');

      // Create a mock EntityManager that returns the existing entity
      const mockAssign = vi.fn((entity, data) => {
        // Simulate what em.assign() does - merge data onto entity
        Object.assign(entity, data);
      });

      const mockEm = {
        findOneOrFail: vi.fn().mockResolvedValue(existingUser),
        assign: mockAssign
      } as unknown as EntityManager;

      // Perform PARTIAL update - only update email
      const partialUpdateData = {
        id: userId,
        email: 'john.updated@example.com'
        // Note: firstName, lastName, phoneNumber, bio are NOT included
      };

      const updatedUser = await TestUser.update(partialUpdateData, mockEm);

      // Verify the correct methods were called
      expect(mockEm.findOneOrFail).toHaveBeenCalledWith(TestUser, {
        id: userId
      });
      expect(mockAssign).toHaveBeenCalledWith(
        existingUser,
        expect.objectContaining({
          email: 'john.updated@example.com',
          updatedAt: expect.any(Date)
        })
      );

      // Verify the email was updated
      expect(updatedUser.email).toBe('john.updated@example.com');

      // Verify all other fields are preserved
      expect(updatedUser.firstName).toBe('John');
      expect(updatedUser.lastName).toBe('Doe');
      expect(updatedUser.phoneNumber).toBe('+1234567890');
      expect(updatedUser.bio).toBe('Software engineer');
      expect(updatedUser.createdAt).toEqual(new Date('2024-01-01'));
    });

    it('should preserve all fields when updating only firstName', async () => {
      const userId = v4();
      const existingUser = new TestUser();
      existingUser.id = userId;
      existingUser.email = 'jane@example.com';
      existingUser.firstName = 'Jane';
      existingUser.lastName = 'Smith';
      existingUser.phoneNumber = '+9876543210';
      existingUser.bio = 'Product manager';

      const mockEm = {
        findOneOrFail: vi.fn().mockResolvedValue(existingUser),
        assign: vi.fn((entity, data) => Object.assign(entity, data))
      } as unknown as EntityManager;

      // Partial update: change only firstName
      const updatedUser = await TestUser.update(
        { id: userId, firstName: 'Janet' },
        mockEm
      );

      expect(updatedUser.firstName).toBe('Janet'); // Updated
      expect(updatedUser.email).toBe('jane@example.com'); // Preserved
      expect(updatedUser.lastName).toBe('Smith'); // Preserved
      expect(updatedUser.phoneNumber).toBe('+9876543210'); // Preserved
      expect(updatedUser.bio).toBe('Product manager'); // Preserved
    });

    it('should handle null values in partial updates', async () => {
      const userId = v4();
      const existingUser = new TestUser();
      existingUser.id = userId;
      existingUser.email = 'test@example.com';
      existingUser.firstName = 'Test';
      existingUser.lastName = 'User';
      existingUser.phoneNumber = '+5555555555';
      existingUser.bio = 'Test bio';

      const mockEm = {
        findOneOrFail: vi.fn().mockResolvedValue(existingUser),
        assign: vi.fn((entity, data) => Object.assign(entity, data))
      } as unknown as EntityManager;

      // Partial update: explicitly set phoneNumber to null
      const updatedUser = await TestUser.update(
        { id: userId, phoneNumber: null as string | null },
        mockEm
      );

      expect(updatedUser.phoneNumber).toBeNull(); // Explicitly set to null
      expect(updatedUser.email).toBe('test@example.com'); // Preserved
      expect(updatedUser.firstName).toBe('Test'); // Preserved
      expect(updatedUser.lastName).toBe('User'); // Preserved
      expect(updatedUser.bio).toBe('Test bio'); // Preserved
    });

    it('should update multiple fields at once while preserving others', async () => {
      const userId = v4();
      const existingUser = new TestUser();
      existingUser.id = userId;
      existingUser.email = 'multi@example.com';
      existingUser.firstName = 'Multi';
      existingUser.lastName = 'Field';
      existingUser.phoneNumber = '+1234567890';
      existingUser.bio = 'Original bio';

      const mockEm = {
        findOneOrFail: vi.fn().mockResolvedValue(existingUser),
        assign: vi.fn((entity, data) => Object.assign(entity, data))
      } as unknown as EntityManager;

      // Update multiple fields but not all
      const updatedUser = await TestUser.update(
        {
          id: userId,
          email: 'updated.multi@example.com',
          bio: 'Updated bio'
        },
        mockEm
      );

      expect(updatedUser.email).toBe('updated.multi@example.com'); // Updated
      expect(updatedUser.bio).toBe('Updated bio'); // Updated
      expect(updatedUser.firstName).toBe('Multi'); // Preserved
      expect(updatedUser.lastName).toBe('Field'); // Preserved
      expect(updatedUser.phoneNumber).toBe('+1234567890'); // Preserved
    });

    it('should not include id in the assign call', async () => {
      const userId = v4();
      const existingUser = new TestUser();
      existingUser.id = userId;
      existingUser.email = 'test@example.com';
      existingUser.firstName = 'Test';
      existingUser.lastName = 'User';

      const mockAssign = vi.fn((entity, data) => {
        Object.assign(entity, data);
      });

      const mockEm = {
        findOneOrFail: vi.fn().mockResolvedValue(existingUser),
        assign: mockAssign
      } as unknown as EntityManager;

      await TestUser.update(
        { id: userId, email: 'updated@example.com' },
        mockEm
      );

      // Verify that id was NOT included in the assign call
      const assignCall = mockAssign.mock.calls[0][1];
      expect(assignCall).not.toHaveProperty('id');
      expect(assignCall).toHaveProperty('email', 'updated@example.com');
      expect(assignCall).toHaveProperty('updatedAt');
    });
  });
});
