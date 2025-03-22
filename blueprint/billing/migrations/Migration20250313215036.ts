import { Migration } from '@mikro-orm/migrations';

export class Migration20250313215036 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table "billing_provider" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "external_id" text null, "extra_fields" jsonb null, "billing_provider" text check ("billing_provider" in ('none', 'stripe', 'adyen')) null, constraint "billing_provider_pkey" primary key ("id"));`
    );
    this.addSql(
      `alter table "billing_provider" add constraint "billing_provider_external_id_unique" unique ("external_id");`
    );

    this.addSql(
      `create table "payment_link" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "amount" int not null, "currency" text check ("currency" in ('USD', 'EUR', 'GBP', 'CAD', 'AUD', 'CHF', 'JPY', 'SEK', 'NOK', 'DKK', 'CZK', 'PLN', 'HUF', 'RON', 'BGN', 'RUB', 'INR', 'BRL', 'ZAR', 'MXN', 'CNY', 'HKD', 'TWD', 'SGD', 'THB', 'TRY', 'RSD', 'HRK', 'ISK', 'BAM')) not null, "description" text null, "metadata" jsonb null, "success_redirect_uri" text not null, "cancel_redirect_uri" text not null, "extra_fields" jsonb null, constraint "payment_link_pkey" primary key ("id"));`
    );

    this.addSql(
      `create table "plan" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "active" boolean not null, "type" text not null, "name" text not null, "description" text null, "price" int not null, "cadence" text check ("cadence" in ('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'ANNUALLY')) not null, "features" text[] null, "extra_fields" jsonb null, "external_id" text not null, "billing_provider" text check ("billing_provider" in ('none', 'stripe', 'adyen')) null, constraint "plan_pkey" primary key ("id"));`
    );
    this.addSql(
      `alter table "plan" add constraint "plan_external_id_unique" unique ("external_id");`
    );

    this.addSql(
      `create table "session" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "customer_email" text not null, "payment_methods" text[] not null, "metadata" jsonb null, "success_redirect_uri" text not null, "cancel_redirect_uri" text not null, "extra_fields" jsonb null, constraint "session_pkey" primary key ("id"));`
    );

    this.addSql(
      `create table "subscription" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "party_id" text not null, "party_type" text check ("party_type" in ('user', 'organization')) not null, "description" text null, "active" boolean not null, "product_id" text not null, "extra_fields" jsonb null, "external_id" text not null, "billing_provider" text check ("billing_provider" in ('none', 'stripe', 'adyen')) null, "start_date" timestamptz not null, "end_date" timestamptz not null, "status" text not null, constraint "subscription_pkey" primary key ("id"));`
    );
    this.addSql(
      `alter table "subscription" add constraint "subscription_external_id_unique" unique ("external_id");`
    );
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "billing_provider" cascade;`);

    this.addSql(`drop table if exists "payment_link" cascade;`);

    this.addSql(`drop table if exists "plan" cascade;`);

    this.addSql(`drop table if exists "session" cascade;`);

    this.addSql(`drop table if exists "subscription" cascade;`);
  }
}
