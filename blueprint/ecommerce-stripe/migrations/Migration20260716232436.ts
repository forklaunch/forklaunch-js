import { Migration } from '@mikro-orm/migrations';

export class Migration20260716232436 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`create table "gift_card" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "retention_anonymized_at" timestamptz null, "code" text not null, "initial_cents" int not null, "currency" text not null, "balance_cents" int not null, primary key ("id"));`);
    this.addSql(`alter table "gift_card" add constraint "gift_card_code_unique" unique ("code");`);

    this.addSql(`create table "promo_code" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "retention_anonymized_at" timestamptz null, "code" text not null, "type" text not null, "value" int not null, "max_redemptions" int null, "min_subtotal_cents" int null, "expires_at" timestamptz null, "times_redeemed" int not null, "active" boolean not null, primary key ("id"));`);
    this.addSql(`alter table "promo_code" add constraint "promo_code_code_unique" unique ("code");`);

    this.addSql(`alter table "promo_code" add constraint "promo_code_type_check" check ("type" in ('percent', 'fixed', 'free_shipping'));`);

    this.addSql(`alter table "order" add "discount_cents" int not null, add "gift_card_cents" int not null;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "gift_card" cascade;`);
    this.addSql(`drop table if exists "promo_code" cascade;`);

    this.addSql(`alter table "order" drop column "discount_cents", drop column "gift_card_cents";`);
  }

}
