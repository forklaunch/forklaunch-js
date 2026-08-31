import { Migration } from '@mikro-orm/migrations';

export class Migration00000000000000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table "patient" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "retention_anonymized_at" timestamptz null, "organization_id" uuid not null, "mrn" text not null, "first_name" text not null, "last_name" text not null, "date_of_birth" timestamptz not null, "address_line1" text null, "city" text null, "state" text null, "postal_code" text null, "phone_number" text null, "email" text null, "ssn" text null, constraint "patient_pkey" primary key ("id"));`
    );
    this.addSql(
      `alter table "patient" add constraint "patient_mrn_unique" unique ("mrn");`
    );

    this.addSql(
      `create table "insurance" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "retention_anonymized_at" timestamptz null, "organization_id" uuid not null, "patient_id" uuid not null, "payer_name" text not null, "member_id" text not null, "group_number" text null, constraint "insurance_pkey" primary key ("id"));`
    );

    this.addSql(
      `create table "encounter" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "retention_anonymized_at" timestamptz null, "organization_id" uuid not null, "patient_id" uuid not null, "provider_id" uuid not null, "visit_date" timestamptz not null, constraint "encounter_pkey" primary key ("id"));`
    );

    this.addSql(
      `create table "diagnosis" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "retention_anonymized_at" timestamptz null, "organization_id" uuid not null, "encounter_id" uuid not null, "icd10_code" text not null, constraint "diagnosis_pkey" primary key ("id"));`
    );

    this.addSql(
      `create table "charge" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "retention_anonymized_at" timestamptz null, "organization_id" uuid not null, "encounter_id" uuid not null, "procedure_code" text not null, "units" int not null, "amount" double precision not null, constraint "charge_pkey" primary key ("id"));`
    );

    this.addSql(
      `create table "claim" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "retention_anonymized_at" timestamptz null, "organization_id" uuid not null, "patient_id" uuid not null, "encounter_id" uuid not null, "payer_id" uuid null, "status" text not null default 'draft', constraint "claim_pkey" primary key ("id"));`
    );

    this.addSql(
      `create table "remittance" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "retention_anonymized_at" timestamptz null, "organization_id" uuid not null, "claim_id" uuid not null, "paid_amount" double precision not null, "carc_codes" text[] null, "rarc_codes" text[] null, "received_at" timestamptz not null, constraint "remittance_pkey" primary key ("id"));`
    );

    this.addSql(
      `create table "denial" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "retention_anonymized_at" timestamptz null, "organization_id" uuid not null, "claim_id" uuid not null, "carc_code" text not null, "category" text not null, "worklist_status" text not null, "resolved_at" timestamptz null, constraint "denial_pkey" primary key ("id"));`
    );

    this.addSql(
      `create table "code_set_license" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "retention_anonymized_at" timestamptz null, "organization_id" uuid not null, "code_set_type" text not null, "status" text not null default 'none', "signed_at" timestamptz null, constraint "code_set_license_pkey" primary key ("id"));`
    );

    this.addSql(
      `create table "icd10_code" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "retention_anonymized_at" timestamptz null, "code" text not null, "description" text not null, "effective_date" timestamptz null, constraint "icd10_code_pkey" primary key ("id"));`
    );
    this.addSql(
      `alter table "icd10_code" add constraint "icd10_code_code_unique" unique ("code");`
    );

    this.addSql(
      `create table "hcpcs_code" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "retention_anonymized_at" timestamptz null, "code" text not null, "description" text not null, "effective_date" timestamptz null, constraint "hcpcs_code_pkey" primary key ("id"));`
    );
    this.addSql(
      `alter table "hcpcs_code" add constraint "hcpcs_code_code_unique" unique ("code");`
    );

    // Org-scoped, unlike icd10_code/hcpcs_code — real CPT content is
    // licensed per organization (§5). Uniqueness is the composite
    // (organization_id, code) below, not a single-column constraint on
    // "code" alone, since code repeats across organizations.
    this.addSql(
      `create table "cpt_code" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "retention_anonymized_at" timestamptz null, "organization_id" uuid not null, "code" text not null, "description" text not null, "effective_date" timestamptz null, constraint "cpt_code_pkey" primary key ("id"));`
    );
    this.addSql(
      `alter table "cpt_code" add constraint "cpt_code_organization_id_code_unique" unique ("organization_id", "code");`
    );

    this.addSql(
      `alter table "insurance" add constraint "insurance_patient_id_foreign" foreign key ("patient_id") references "patient" ("id") on update cascade on delete cascade;`
    );

    this.addSql(
      `alter table "encounter" add constraint "encounter_patient_id_foreign" foreign key ("patient_id") references "patient" ("id") on update cascade on delete cascade;`
    );

    this.addSql(
      `alter table "diagnosis" add constraint "diagnosis_encounter_id_foreign" foreign key ("encounter_id") references "encounter" ("id") on update cascade on delete cascade;`
    );

    this.addSql(
      `alter table "charge" add constraint "charge_encounter_id_foreign" foreign key ("encounter_id") references "encounter" ("id") on update cascade on delete cascade;`
    );

    this.addSql(
      `alter table "claim" add constraint "claim_patient_id_foreign" foreign key ("patient_id") references "patient" ("id") on update cascade on delete cascade;`
    );
    this.addSql(
      `alter table "claim" add constraint "claim_encounter_id_foreign" foreign key ("encounter_id") references "encounter" ("id") on update cascade on delete cascade;`
    );
    this.addSql(
      `alter table "claim" add constraint "claim_payer_id_foreign" foreign key ("payer_id") references "insurance" ("id") on update cascade on delete set null;`
    );

    this.addSql(
      `alter table "remittance" add constraint "remittance_claim_id_foreign" foreign key ("claim_id") references "claim" ("id") on update cascade on delete cascade;`
    );

    this.addSql(
      `alter table "denial" add constraint "denial_claim_id_foreign" foreign key ("claim_id") references "claim" ("id") on update cascade on delete cascade;`
    );
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "denial" cascade;`);
    this.addSql(`drop table if exists "remittance" cascade;`);
    this.addSql(`drop table if exists "claim" cascade;`);
    this.addSql(`drop table if exists "charge" cascade;`);
    this.addSql(`drop table if exists "diagnosis" cascade;`);
    this.addSql(`drop table if exists "encounter" cascade;`);
    this.addSql(`drop table if exists "insurance" cascade;`);
    this.addSql(`drop table if exists "patient" cascade;`);
    this.addSql(`drop table if exists "code_set_license" cascade;`);
    this.addSql(`drop table if exists "hcpcs_code" cascade;`);
    this.addSql(`drop table if exists "icd10_code" cascade;`);
  }
}
