/**
 * Baseline migration for the managed-apps relay session-ingest handoff table.
 *
 * The `unique ("nonce")` constraint is the physical backing of the replay
 * guard - the insert of a duplicate nonce fails here, and the service surfaces
 * that as a 409 rather than completing the session twice.
 *
 * NOTE: this SQL targets PostgreSQL (the default for managed apps). If your
 * service uses a different database, delete this file and regenerate it with
 * `mikro-orm migration:create` after the entity is wired in.
 */

import { Migration } from '@mikro-orm/migrations';

export class Migration00000000000002_relaySessionHandoff extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table "relay_session_handoff" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "retention_anonymized_at" timestamptz null, "nonce" text not null, "owner_user_id" text null, "active_organization_id" text null, "redirect_to" text not null, "expires_at" timestamptz not null, "consumed_at" timestamptz null, constraint "relay_session_handoff_pkey" primary key ("id"));`
    );
    this.addSql(
      `alter table "relay_session_handoff" add constraint "relay_session_handoff_nonce_unique" unique ("nonce");`
    );
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "relay_session_handoff" cascade;`);
  }
}
