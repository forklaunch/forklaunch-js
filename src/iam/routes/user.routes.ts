import { array, forklaunchRouter, SchemaValidator, string } from 'core';
import { ci } from '../app';
import {
  CreateUserDtoMapper,
  UpdateUserDtoMapper,
  UserDtoMapper
} from '../models/dtoMapper/user.dtoMapper';
import { Organization } from '../models/persistence/organization.entity';
import { Role } from '../models/persistence/role.entity';

export const router = forklaunchRouter('/user');
const service = () => ci.resolve('userService');
const organizationService = () => ci.resolve('organizationService');
const roleService = () => ci.resolve('roleService');

export const userRoutes = {
  // Create user
  createUser: router.post(
    '/',
    {
      name: 'Create User',
      summary: 'Creates a new user',
      body: CreateUserDtoMapper.schema(),
      responses: {
        201: string,
        500: string
      }
    },
    async (req, res) => {
      // use req context to prepopulate organizationId from AuthToken
      const userEntity = CreateUserDtoMapper.deserializeJsonToEntity(
        SchemaValidator(),
        req.body
      );
      const organizationEntity = req.body.organizationId
        ? await organizationService().getOrganization(req.body.organizationId)
        : undefined;
      const rolesEntities = req.body.roleIds
        ? await roleService().getBatchRoles(req.body.roleIds)
        : undefined;

      await service().createUser({
        user: userEntity,
        organization: organizationEntity,
        roles: rolesEntities
      });
      res.status(201).send('User created successfully');
    }
  ),

  // Create batch users
  createUsers: router.post(
    '/batch',
    {
      name: 'Create Batch Users',
      summary: 'Creates multiple users',
      body: array(CreateUserDtoMapper.schema()),
      responses: {
        201: string,
        500: string
      }
    },
    async (req, res) => {
      let organization: Organization;
      const roleCache: Record<string, Role> = {};
      const batchUsers = await Promise.all(
        req.body.map(async (createUserType) => {
          if (createUserType.organizationId) {
            if (!organization) {
              organization = await organizationService().getOrganization(
                createUserType.organizationId
              );
            } else if (organization.id !== createUserType.organizationId) {
              throw new Error(
                'All users in a batch must belong to the same organization'
              );
            }
          }

          const lookupRoles: string[] = [];
          createUserType.roleIds?.forEach((roleId) => {
            if (!roleCache[roleId]) {
              lookupRoles.push(roleId);
            }
          });
          const mergeRoles = await roleService().getBatchRoles(lookupRoles);

          mergeRoles.forEach((role) => {
            roleCache[role.id] = role;
          });
          return {
            user: CreateUserDtoMapper.deserializeJsonToEntity(
              SchemaValidator(),
              createUserType
            ),
            organization,
            roles: createUserType.roleIds?.map((roleId) => roleCache[roleId])
          };
        })
      );

      await service().createBatchUsers(batchUsers);
      res.status(201).send('Batch users created successfully');
    }
  ),

  // Get user by ID
  getUser: router.get(
    '/:id',
    {
      name: 'Get User',
      summary: 'Gets a user by ID',
      responses: {
        200: UserDtoMapper.schema(),
        500: string
      },
      params: {
        id: string
      }
    },
    async (req, res) => {
      const id = req.params.id;
      const user = await service().getUser(id);
      const userDto = UserDtoMapper.serializeEntityToJson(
        SchemaValidator(),
        user
      );

      res.status(200).json(userDto);
    }
  ),

  // Get batch users by IDs
  getUsers: router.get(
    '/batch',
    {
      name: 'Get Batch Users',
      summary: 'Gets multiple users by IDs',
      responses: {
        200: array(UserDtoMapper.schema()),
        500: string
      },
      query: {
        ids: string
      }
    },
    async (req, res) => {
      const ids = req.query.ids.split(',');
      const users = await service().getBatchUsers(ids);
      const userDtos = users.map((user) =>
        UserDtoMapper.serializeEntityToJson(SchemaValidator(), user)
      );

      res.status(200).json(userDtos);
    }
  ),

  // Update user by ID
  updateUser: router.put(
    '/',
    {
      name: 'Update User',
      summary: 'Updates a user by ID',
      body: UpdateUserDtoMapper.schema(),
      responses: {
        200: string,
        500: string
      }
    },
    async (req, res) => {
      const userEntity = UpdateUserDtoMapper.deserializeJsonToEntity(
        SchemaValidator(),
        req.body
      );
      const rolesEntities = req.body.roleIds
        ? await roleService().getBatchRoles(req.body.roleIds)
        : undefined;

      await service().updateUser({
        user: userEntity,
        roles: rolesEntities
      });
      res.status(200).send('User updated successfully');
    }
  ),

  // Update batch users by IDs
  updateUsers: router.put(
    '/batch',
    {
      name: 'Update Batch Users',
      summary: 'Updates multiple users by IDs',
      body: array(UpdateUserDtoMapper.schema()),
      responses: {
        200: string,
        500: string
      }
    },
    async (req, res) => {
      const roleCache: Record<string, Role> = {};
      const batchUsers = await Promise.all(
        req.body.map(async (updateUserType) => {
          const lookupRoles: string[] = [];
          updateUserType.roleIds?.forEach((roleId) => {
            if (!roleCache[roleId]) {
              lookupRoles.push(roleId);
            }
          });
          const mergeRoles = await roleService().getBatchRoles(lookupRoles);

          mergeRoles.forEach((role) => {
            roleCache[role.id] = role;
          });
          return {
            user: UpdateUserDtoMapper.deserializeJsonToEntity(
              SchemaValidator(),
              updateUserType
            ),
            roles: updateUserType.roleIds?.map((roleId) => roleCache[roleId])
          };
        })
      );

      await service().updateBatchUsers(batchUsers);
      res.status(200).send('Batch users updated successfully');
    }
  ),

  // Delete user by ID
  deleteUser: router.delete(
    '/:id',
    {
      name: 'Delete User',
      summary: 'Deletes a user by ID',
      responses: {
        200: string,
        500: string
      },
      params: {
        id: string
      }
    },
    async (req, res) => {
      const id = req.params.id;
      await service().deleteUser(id);
      res.status(200).send('User deleted successfully');
    }
  ),

  // Delete batch users by IDs
  deleteUsers: router.delete(
    '/batch',
    {
      name: 'Delete Batch Users',
      summary: 'Deletes multiple users by IDs',
      responses: {
        200: string,
        500: string
      },
      query: {
        ids: string
      }
    },
    async (req, res) => {
      const ids = req.query.ids.split(',');
      await service().deleteUsers(ids);
      res.status(200).send('Batch users deleted successfully');
    }
  ),

  // Verify user has a role
  verifyUserRole: router.get(
    '/:id/verify-role/:roleId',
    {
      name: 'Verify User Role',
      summary: 'Verifies if a user has a specified role',
      responses: {
        200: string,
        500: string
      },
      params: {
        id: string,
        roleId: string
      }
    },
    async (req, res) => {
      const { id, roleId } = req.params;
      await service().verifyHasRole(id, roleId);
      res.status(200).send('User has the specified role');
    }
  ),

  // Verify user has a permission
  verifyUserPermission: router.get(
    '/:id/verify-permission/:permissionId',
    {
      name: 'Verify User Permission',
      summary: 'Verifies if a user has a specified permission',
      responses: {
        200: string,
        500: string
      },
      params: {
        id: string,
        permissionId: string
      }
    },
    async (req, res) => {
      const { id, permissionId } = req.params;
      await service().verifyHasPermission(id, permissionId);
      res.status(200).send('User has the specified permission');
    }
  )
};
