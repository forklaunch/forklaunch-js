import { Migration } from '@mikro-orm/migrations';

export class Migration20241014020018 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "organization" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "name" varchar(255) not null, "domain" varchar(255) not null, "logo_url" varchar(255) null, "subscription" varchar(255) not null, "status" varchar(255) not null default 'active', constraint "organization_pkey" primary key ("id"));`);
    this.addSql(`alter table "organization" add constraint "organization_subscription_unique" unique ("subscription");`);

    this.addSql(`create table "permission" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "slug" varchar(255) not null, constraint "permission_pkey" primary key ("id"));`);

    this.addSql(`create table "role" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "name" varchar(255) not null, constraint "role_pkey" primary key ("id"));`);

    this.addSql(`create table "role_permissions" ("role_id" uuid not null, "permission_id" uuid not null, constraint "role_permissions_pkey" primary key ("role_id", "permission_id"));`);

    this.addSql(`create table "user" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "email" varchar(255) not null, "password_hash" varchar(255) not null, "first_name" varchar(255) not null, "last_name" varchar(255) not null, "phone_number" varchar(255) null, "organization_id" uuid not null, "subscription" varchar(255) null, "extra_fields" jsonb null, constraint "user_pkey" primary key ("id"));`);
    this.addSql(`alter table "user" add constraint "user_email_unique" unique ("email");`);
    this.addSql(`alter table "user" add constraint "user_subscription_unique" unique ("subscription");`);

    this.addSql(`create table "user_roles" ("user_id" uuid not null, "role_id" uuid not null, constraint "user_roles_pkey" primary key ("user_id", "role_id"));`);

    this.addSql(`alter table "role_permissions" add constraint "role_permissions_role_id_foreign" foreign key ("role_id") references "role" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "role_permissions" add constraint "role_permissions_permission_id_foreign" foreign key ("permission_id") references "permission" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "user" add constraint "user_organization_id_foreign" foreign key ("organization_id") references "organization" ("id") on update cascade;`);

    this.addSql(`alter table "user_roles" add constraint "user_roles_user_id_foreign" foreign key ("user_id") references "user" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "user_roles" add constraint "user_roles_role_id_foreign" foreign key ("role_id") references "role" ("id") on update cascade on delete cascade;`);
  }

}
