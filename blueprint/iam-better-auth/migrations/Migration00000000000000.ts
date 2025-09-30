import { Migration } from '@mikro-orm/migrations';

export class Migration00000000000000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table "organization" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "name" text not null, "domain" text not null, "logo_url" text null, "subscription" text not null, "status" text not null default 'active', constraint "organization_pkey" primary key ("id"));`
    );
    this.addSql(
      `alter table "organization" add constraint "organization_subscription_unique" unique ("subscription");`
    );

    this.addSql(
      `create table "permission" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "slug" text not null, constraint "permission_pkey" primary key ("id"));`
    );

    this.addSql(
      `create table "role" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "name" text not null, constraint "role_pkey" primary key ("id"));`
    );

    this.addSql(
      `create table "role_permissions" ("role_id" uuid not null, "permission_id" uuid not null, constraint "role_permissions_pkey" primary key ("role_id", "permission_id"));`
    );

    this.addSql(
      `create table "user" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "email" text not null, "email_verified" boolean not null, "name" text not null, "first_name" text not null, "last_name" text not null, "image" text null, "phone_number" text null, "organization_id" uuid null, "subscription" text null, "provider_fields" jsonb null, constraint "user_pkey" primary key ("id"));`
    );
    this.addSql(
      `alter table "user" add constraint "user_email_unique" unique ("email");`
    );
    this.addSql(
      `alter table "user" add constraint "user_name_unique" unique ("name");`
    );
    this.addSql(
      `alter table "user" add constraint "user_subscription_unique" unique ("subscription");`
    );

    this.addSql(
      `create table "user_roles" ("user_id" uuid not null, "role_id" uuid not null, constraint "user_roles_pkey" primary key ("user_id", "role_id"));`
    );

    this.addSql(
      `create table "account" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "user_id" uuid not null, "account_id" text not null, "provider_id" text not null, "access_token" text null, "refresh_token" text null, "access_token_expires_at" timestamptz null, "refresh_token_expires_at" timestamptz null, "scope" text null, "id_token" text null, "password" text null, constraint "account_pkey" primary key ("id"));`
    );

    this.addSql(
      `create table "session" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "user_id" uuid not null, "token" text not null, "expires_at" timestamptz not null, "ip_address" text null, "user_agent" text null, constraint "session_pkey" primary key ("id"));`
    );

    this.addSql(
      `create table "verification" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "identifier" text not null, "value" text not null, "expires_at" timestamptz not null, constraint "verification_pkey" primary key ("id"));`
    );

    this.addSql(
      `alter table "role_permissions" add constraint "role_permissions_role_id_foreign" foreign key ("role_id") references "role" ("id") on update cascade on delete cascade;`
    );
    this.addSql(
      `alter table "role_permissions" add constraint "role_permissions_permission_id_foreign" foreign key ("permission_id") references "permission" ("id") on update cascade on delete cascade;`
    );

    this.addSql(
      `alter table "user" add constraint "user_organization_id_foreign" foreign key ("organization_id") references "organization" ("id") on update cascade on delete set null;`
    );

    this.addSql(
      `alter table "user_roles" add constraint "user_roles_user_id_foreign" foreign key ("user_id") references "user" ("id") on update cascade on delete cascade;`
    );
    this.addSql(
      `alter table "user_roles" add constraint "user_roles_role_id_foreign" foreign key ("role_id") references "role" ("id") on update cascade on delete cascade;`
    );

    this.addSql(
      `alter table "account" add constraint "account_user_id_foreign" foreign key ("user_id") references "user" ("id") on update cascade on delete cascade;`
    );

    this.addSql(
      `alter table "session" add constraint "session_user_id_foreign" foreign key ("user_id") references "user" ("id") on update cascade on delete cascade;`
    );
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "verification" cascade;`);
    this.addSql(`drop table if exists "session" cascade;`);
    this.addSql(`drop table if exists "account" cascade;`);
    this.addSql(`drop table if exists "user_roles" cascade;`);
    this.addSql(`drop table if exists "user" cascade;`);
    this.addSql(`drop table if exists "role_permissions" cascade;`);
    this.addSql(`drop table if exists "role" cascade;`);
    this.addSql(`drop table if exists "permission" cascade;`);
    this.addSql(`drop table if exists "organization" cascade;`);
  }
}
