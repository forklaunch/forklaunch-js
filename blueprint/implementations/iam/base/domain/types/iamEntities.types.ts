import { ResolvedEntity } from '@forklaunch/core/persistence';
import {
  Organization,
  Permission,
  Role,
  User
} from '../../persistence/entities';

// organization entity mapper types
export type OrganizationEntities<OrganizationStatus> = {
  OrganizationMapper: {
    '~entity': ResolvedEntity<(typeof Organization)['~entity']> & {
      status: OrganizationStatus[keyof OrganizationStatus];
    };
  };
  CreateOrganizationMapper: {
    '~entity': ResolvedEntity<(typeof Organization)['~entity']> & {
      status: OrganizationStatus[keyof OrganizationStatus];
    };
  };
  UpdateOrganizationMapper: {
    '~entity': ResolvedEntity<(typeof Organization)['~entity']> & {
      status: OrganizationStatus[keyof OrganizationStatus];
    };
  };
};

// permission entity mapper types
export type PermissionEntities = {
  PermissionMapper: {
    '~entity': ResolvedEntity<(typeof Permission)['~entity']>;
  };
  CreatePermissionMapper: {
    '~entity': ResolvedEntity<(typeof Permission)['~entity']>;
  };
  UpdatePermissionMapper: {
    '~entity': ResolvedEntity<(typeof Permission)['~entity']>;
  };
  RoleEntityMapper: {
    '~entity': ResolvedEntity<(typeof Role)['~entity']>;
  };
};

// role entity mapper types
export type RoleEntities = {
  RoleMapper: {
    '~entity': ResolvedEntity<(typeof Role)['~entity']>;
  };
  CreateRoleMapper: {
    '~entity': ResolvedEntity<(typeof Role)['~entity']>;
  };
  UpdateRoleMapper: {
    '~entity': ResolvedEntity<(typeof Role)['~entity']>;
  };
};

// user entity mapper types
export type UserEntities = {
  UserMapper: {
    '~entity': ResolvedEntity<(typeof User)['~entity']>;
  };
  CreateUserMapper: {
    '~entity': ResolvedEntity<(typeof User)['~entity']>;
  };
  UpdateUserMapper: {
    '~entity': ResolvedEntity<(typeof User)['~entity']>;
  };
};
