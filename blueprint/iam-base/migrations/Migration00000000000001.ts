import { Migration } from '@mikro-orm/migrations';

export class Migration00000000000001 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      insert into "permission" ("id", "created_at", "updated_at", "slug") values
      (gen_random_uuid(), now(), now(), 'platform:read'),
      (gen_random_uuid(), now(), now(), 'platform:write');
    `);

    this.addSql(`
      insert into "role" ("id", "created_at", "updated_at", "name") values
      (gen_random_uuid(), now(), now(), 'viewer'),
      (gen_random_uuid(), now(), now(), 'editor'),
      (gen_random_uuid(), now(), now(), 'admin'),
      (gen_random_uuid(), now(), now(), 'system');
    `);

    this.addSql(`
      insert into "role_permissions" ("role_id", "permission_id") values
      ((select "id" from "role" where "name" = 'viewer'), (select "id" from "permission" where "slug" = 'platform:read')),
      ((select "id" from "role" where "name" = 'editor'), (select "id" from "permission" where "slug" = 'platform:read')),
      ((select "id" from "role" where "name" = 'editor'), (select "id" from "permission" where "slug" = 'platform:write')),
      ((select "id" from "role" where "name" = 'admin'), (select "id" from "permission" where "slug" = 'platform:read')),
      ((select "id" from "role" where "name" = 'admin'), (select "id" from "permission" where "slug" = 'platform:write')),
      ((select "id" from "role" where "name" = 'system'), (select "id" from "permission" where "slug" = 'platform:read')),
      ((select "id" from "role" where "name" = 'system'), (select "id" from "permission" where "slug" = 'platform:write'));
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`
      delete from "role_permissions" where "role_id" in (
        select "id" from "role" where "name" in ('viewer', 'editor', 'admin', 'system')
      );
    `);

    this.addSql(`
      delete from "role" where "name" in ('viewer', 'editor', 'admin', 'system');
    `);

    this.addSql(`
      delete from "permission" where "slug" in ('platform:read', 'platform:write');
    `);
  }
}
