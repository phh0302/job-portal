import { MigrationInterface, QueryRunner } from "typeorm";

export class CompanyTeam1791444485454 implements MigrationInterface {
    name = 'CompanyTeam1791444485454'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "email_outbox" ("id" bigint NOT NULL IDENTITY(1,1), "to_email" nvarchar(255) NOT NULL, "subject" nvarchar(300) NOT NULL, "html" nvarchar(MAX) NOT NULL, "status" nvarchar(10) CONSTRAINT CHK_0df2324e74fe17a33fb0200a9b_ENUM CHECK(status IN ('PENDING','SENDING','SENT','FAILED')) NOT NULL CONSTRAINT "DF_6495bafbfe9a7d29dfe55713281" DEFAULT 'PENDING', "attempts" int NOT NULL CONSTRAINT "DF_509eb3f5ce0cacb5d2cf0e30b63" DEFAULT 0, "last_error" nvarchar(1000), "next_attempt_at" datetime2 NOT NULL, "locked_at" datetime2, "sent_at" datetime2, "created_at" datetime2 NOT NULL CONSTRAINT "DF_73ff4b3243a90042028e1e47f54" DEFAULT getdate(), CONSTRAINT "PK_b6fbfc201f705fbf1ac87bd7197" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IX_email_outbox_status_next" ON "email_outbox" ("status", "next_attempt_at") `);
        await queryRunner.query(`CREATE TABLE "company_invitations" ("id" int NOT NULL IDENTITY(1,1), "company_id" int NOT NULL, "email" nvarchar(255) NOT NULL, "role" nvarchar(10) CONSTRAINT CHK_1513af25d12ac3a23903a77bad_ENUM CHECK(role IN ('OWNER','MEMBER')) NOT NULL CONSTRAINT "DF_a2dc81db606fc1b09e8aa2df857" DEFAULT 'MEMBER', "token_hash" char(64) NOT NULL, "invited_by_id" int, "expires_at" datetime2 NOT NULL, "accepted_at" datetime2, "revoked_at" datetime2, "created_at" datetime2 NOT NULL CONSTRAINT "DF_172893c3b6e4738e2ffba7235b6" DEFAULT getdate(), CONSTRAINT "PK_f73da096e85d9dcfaee9fb4ea5e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_company_invitations_token" ON "company_invitations" ("token_hash") `);
        await queryRunner.query(`CREATE INDEX "IX_company_invitations_company_email" ON "company_invitations" ("company_id", "email") `);
        await queryRunner.query(`ALTER TABLE "employer_profiles" ADD "company_role" nvarchar(10) CONSTRAINT CHK_757f4c7635cd7cabe253834085_ENUM CHECK(company_role IN ('OWNER','MEMBER')) NOT NULL CONSTRAINT "DF_65bc9030976f795040799ad38e5" DEFAULT 'OWNER'`);
        await queryRunner.query(`ALTER TABLE "company_invitations" ADD CONSTRAINT "FK_company_invitations_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "company_invitations" ADD CONSTRAINT "FK_company_invitations_invited_by" FOREIGN KEY ("invited_by_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "company_invitations" DROP CONSTRAINT "FK_company_invitations_invited_by"`);
        await queryRunner.query(`ALTER TABLE "company_invitations" DROP CONSTRAINT "FK_company_invitations_company"`);
        await queryRunner.query(`ALTER TABLE "employer_profiles" DROP CONSTRAINT "DF_65bc9030976f795040799ad38e5"`);
        await queryRunner.query(`ALTER TABLE "employer_profiles" DROP COLUMN "company_role"`);
        await queryRunner.query(`DROP INDEX "IX_company_invitations_company_email" ON "company_invitations"`);
        await queryRunner.query(`DROP INDEX "UQ_company_invitations_token" ON "company_invitations"`);
        await queryRunner.query(`DROP TABLE "company_invitations"`);
        await queryRunner.query(`DROP INDEX "IX_email_outbox_status_next" ON "email_outbox"`);
        await queryRunner.query(`DROP TABLE "email_outbox"`);
    }

}
