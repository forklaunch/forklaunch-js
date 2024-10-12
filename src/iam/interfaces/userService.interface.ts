// https://ts.dev/style/#descriptive-usernames

import { BaseService } from '@forklaunch/core/services';
import { Organization } from '../models/persistence/organization.entity';
import { Role } from '../models/persistence/role.entity';
import { User } from '../models/persistence/user.entity';

export type CreateUserData = UpdateUserData & { organization?: Organization };
export type UpdateUserData = { user: User; roles?: Role[] };

export interface UserService extends BaseService {
  createUser(data: CreateUserData): Promise<void>;
  createBatchUsers(data: CreateUserData[]): Promise<void>;
  getUser(id: string): Promise<User>;
  getBatchUsers(ids: string[]): Promise<User[]>;
  updateUser(data: UpdateUserData): Promise<void>;
  updateBatchUsers(data: UpdateUserData[]): Promise<void>;
  deleteUser(id: string): Promise<void>;
  deleteUsers(ids: string[]): Promise<void>;

  verifyHasRole(id: string, roleId: string): Promise<void>;
  verifyHasPermission(id: string, permissionId: string): Promise<void>;
}
