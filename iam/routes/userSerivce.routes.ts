import UserService from '../interfaces/userService.interface';
import ExpressController from '../../../common/src/interfaces/hyper.express.controller.interface';
import { forklaunchRouter } from '../../../sdk-generator/forklaunch.hyper.express';
import { Organization } from '../models/mikro/entities/organization.entity';
import { Role } from '../models/mikro/entities/role.entity';
import { CreateUserDto, UpdateUserDto, UserDto } from '../models/dto/user.dto';
import OrganizationService from '../interfaces/organizationService.interface';
import RoleService from '../interfaces/roleService.interface';
import { ServiceFactory } from '../../../sdk-generator/forklaunchServiceComposer';
import { array, string } from '../../../common/src/types/schema.types';
import { EntityManager } from '@mikro-orm/core';

class UserController implements ExpressController {
  readonly basePath = '/user';
  readonly router;

  constructor(private service: ServiceFactory<UserService>, private organizationService: ServiceFactory<OrganizationService>, private roleService: ServiceFactory<RoleService>, private em: EntityManager) {
    this.router = forklaunchRouter(this.basePath);

    // Create user
    this.router.post('/', {
        name: 'Create User',
        summary: 'Creates a new user',
        body: CreateUserDto.schema(),
        responses: {
            201: string,
            500: string
        }
    }, async (req, res) => {
      // use req context to prepopulate organizationId from AuthToken
      const userEntity = CreateUserDto.deserializeJsonToEntity(req.body);
      const organizationEntity = req.body.organizationId ? await this.organizationService.create(this.em.fork()).getOrganization(req.body.organizationId) : undefined;
      const rolesEntities = req.body.roleIds ? await this.roleService.create(this.em.fork()).getBatchRoles(req.body.roleIds) : undefined;

      await this.service.create(this.em.fork()).createUser({
          user: userEntity, 
          organization: organizationEntity, 
          roles: rolesEntities
      });
      res.status(201).send('User created successfully');
    });

    // Create batch users
    this.router.post('/batch', {
        name: 'Create Batch Users',
        summary: 'Creates multiple users',
        body: array(CreateUserDto.schema()),
        responses: {
            201: string,
            500: string
        }
    }, async (req, res) => {
      let organization: Organization;
      const roleCache: Record<string, Role> = {};
      const batchUsers = await Promise.all(req.body.map(async createUserType => {
        if (createUserType.organizationId) {
          if (!organization) {
            organization = await this.organizationService.create(this.em.fork()).getOrganization(createUserType.organizationId);
          } else if (organization.id !== createUserType.organizationId) {
            throw new Error('All users in a batch must belong to the same organization');
          }
        }

        const lookupRoles: string[] = [];
        createUserType.roleIds?.forEach(roleId => {
          if (!roleCache[roleId]) {
            lookupRoles.push(roleId);
          }
        });
        const mergeRoles = await this.roleService.create(this.em.fork()).getBatchRoles(lookupRoles);

        mergeRoles.forEach(role => {
          roleCache[role.id] = role;
        });
        return {
          user: CreateUserDto.deserializeJsonToEntity(createUserType),
          organization,
          roles: createUserType.roleIds?.map(roleId => roleCache[roleId])
        }
      }));
     

      await this.service.create(this.em.fork()).createBatchUsers(batchUsers);
      res.status(201).send('Batch users created successfully');
    });

    // Get user by ID
    this.router.get('/:id', {
        name: 'Get User',
        summary: 'Gets a user by ID',
        responses: {
            200: UserDto.schema(),
            500: string
        },
        params: {
            id: string
        }
    }, async (req, res) => {
      const id = req.params.id;
      const user = await this.service.create(this.em.fork()).getUser(id);
      const userDto = UserDto.serializeEntityToJson(user);

      res.status(200).json(userDto);
    });

    // Get batch users by IDs
    this.router.get('/batch', {
        name: 'Get Batch Users',
        summary: 'Gets multiple users by IDs',
        responses: {
            200: array(UserDto.schema()),
            500: string
        },
        query: {
            ids: string
        }
    
    }, async (req, res) => {
      const ids = req.query.ids.split(',');
      const users = await this.service.create(this.em.fork()).getBatchUsers(ids);
      const userDtos = users.map(user => UserDto.serializeEntityToJson(user));

      res.status(200).json(userDtos);
    });

    // Update user by ID
    this.router.put('/', {
        name: 'Update User',
        summary: 'Updates a user by ID',
        body: UpdateUserDto.schema(),
        responses: {
            200: string,
            500: string
        },
    },async (req, res) => {
      const userEntity = UpdateUserDto.deserializeJsonToEntity(req.body);
      const rolesEntities = req.body.roleIds ? await this.roleService.create(this.em.fork()).getBatchRoles(req.body.roleIds) : undefined;

      await this.service.create(this.em.fork()).updateUser({
          user: userEntity,
          roles: rolesEntities
      });
      res.status(200).send('User updated successfully');
    });

    // Update batch users by IDs
    this.router.put('/batch', {
        name: 'Update Batch Users',
        summary: 'Updates multiple users by IDs',
        body: array(UpdateUserDto.schema()),
        responses: {
            200: string,
            500: string
        }
    }, async (req, res) => {
      const roleCache: Record<string, Role> = {};
      const batchUsers = await Promise.all(req.body.map(async updateUserType => {
        const lookupRoles: string[] = [];
        updateUserType.roleIds?.forEach(roleId => {
          if (!roleCache[roleId]) {
            lookupRoles.push(roleId);
          }
        });
        const mergeRoles = await this.roleService.create(this.em.fork()).getBatchRoles(lookupRoles);

        mergeRoles.forEach(role => {
          roleCache[role.id] = role;
        });
        return {
          user: UpdateUserDto.deserializeJsonToEntity(updateUserType),
          roles: updateUserType.roleIds?.map(roleId => roleCache[roleId])
        }
      }));
     

      await this.service.create(this.em.fork()).updateBatchUsers(batchUsers);
      res.status(200).send('Batch users updated successfully');
    });

    // Delete user by ID
    this.router.delete('/:id', {
        name: 'Delete User',
        summary: 'Deletes a user by ID',
        responses: {
            200: string,
            500: string
        },
        params: {
            id: string
        }
    }, async (req, res) => {
      const id = req.params.id;
      await this.service.create(this.em.fork()).deleteUser(id);
      res.status(200).send('User deleted successfully');
    });

    // Delete batch users by IDs
    this.router.delete('/batch', {
        name: 'Delete Batch Users',
        summary: 'Deletes multiple users by IDs',
        responses: {
            200: string,
            500: string
        },
        query: {
            ids: string
        }
    }, async (req, res) => {
      const ids = req.query.ids.split(',');
      await this.service.create(this.em.fork()).deleteUsers(ids);
      res.status(200).send('Batch users deleted successfully');
    });

    // Verify user has a role
    this.router.post('/:id/verify-role/:roleId', {
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
    }, async (req, res) => {
      const { id, roleId } = req.params;
      await this.service.create(this.em.fork()).verifyHasRole(id, roleId);
      res.status(200).send('User has the specified role');
    });

    // Verify user has a permission
    this.router.post('/:id/verify-permission/:permissionId', {
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
    }, async (req, res) => {
      const { id, permissionId } = req.params;
      await this.service.create(this.em.fork()).verifyHasPermission(id, permissionId);
      res.status(200).send('User has the specified permission');
    });
  }
}

export default UserController;