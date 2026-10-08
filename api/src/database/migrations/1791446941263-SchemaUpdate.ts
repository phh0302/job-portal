import { MigrationInterface, QueryRunner } from "typeorm";

export class SchemaUpdate1791446941263 implements MigrationInterface {
    name = 'SchemaUpdate1791446941263'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "company_reviews" ("id" int NOT NULL IDENTITY(1,1), "created_at" datetime2 NOT NULL CONSTRAINT "DF_ff912f28c18f9253593a3928cbc" DEFAULT getdate(), "updated_at" datetime2 NOT NULL CONSTRAINT "DF_d7297c1ecb7f820b4a7985fcf71" DEFAULT getdate(), "company_id" int NOT NULL, "candidate_id" int NOT NULL, "rating" tinyint NOT NULL, "title" nvarchar(150) NOT NULL, "pros" nvarchar(2000) NOT NULL, "cons" nvarchar(2000) NOT NULL, "relation" nvarchar(20) CONSTRAINT CHK_109ecf29c66e09986d64ee5f85_ENUM CHECK(relation IN ('CURRENT_EMPLOYEE','FORMER_EMPLOYEE','INTERVIEWED')) NOT NULL, "is_anonymous" bit NOT NULL CONSTRAINT "DF_986b9a86a597370454802d95a80" DEFAULT 1, "status" nvarchar(10) CONSTRAINT CHK_0725a2e805d8145ff96c0cd038_ENUM CHECK(status IN ('PENDING','APPROVED','REJECTED')) NOT NULL CONSTRAINT "DF_52c7edf0c433a6dccd19d0e15d4" DEFAULT 'PENDING', "reject_reason" nvarchar(500), "employer_reply" nvarchar(2000), "replied_at" datetime2, CONSTRAINT "PK_5495f665609ea006242464173c4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IX_company_reviews_status" ON "company_reviews" ("status") `);
        await queryRunner.query(`CREATE INDEX "IX_company_reviews_company_status" ON "company_reviews" ("company_id", "status") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_company_reviews_company_candidate" ON "company_reviews" ("company_id", "candidate_id") `);
        await queryRunner.query(`CREATE TABLE "application_messages" ("id" int NOT NULL IDENTITY(1,1), "application_id" int NOT NULL, "sender_user_id" int NOT NULL, "sender_role" nvarchar(20) CONSTRAINT CHK_3dfdadf4cfdd0bfd4273599e45_ENUM CHECK(sender_role IN ('CANDIDATE','EMPLOYER','ADMIN')) NOT NULL, "body" nvarchar(2000) NOT NULL, "created_at" datetime2 NOT NULL CONSTRAINT "DF_fce976345762f8478a9013e958a" DEFAULT getdate(), CONSTRAINT "PK_ef4ec0c30a4af3ac30b8fde86d3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IX_application_messages_app" ON "application_messages" ("application_id", "id") `);
        await queryRunner.query(`CREATE TABLE "service_plans" ("id" int NOT NULL IDENTITY(1,1), "created_at" datetime2 NOT NULL CONSTRAINT "DF_042984db17a07b5ca80a7a59591" DEFAULT getdate(), "updated_at" datetime2 NOT NULL CONSTRAINT "DF_236284eaa9184b6e249d703e8b3" DEFAULT getdate(), "code" nvarchar(30) NOT NULL, "name" nvarchar(100) NOT NULL, "description" nvarchar(500), "price" decimal(18,0) NOT NULL, "duration_days" int NOT NULL, "featured_credits" int NOT NULL CONSTRAINT "DF_72b4604e8c03501eff1e37e5a9a" DEFAULT 0, "contact_credits" int NOT NULL CONSTRAINT "DF_65c02384a01326567af9e4f147d" DEFAULT 0, "is_active" bit NOT NULL CONSTRAINT "DF_b53658dc9a685d1573ca1d9a1a0" DEFAULT 1, "sort_order" int NOT NULL CONSTRAINT "DF_0daa76e451f206afa1a2c2d8885" DEFAULT 0, CONSTRAINT "PK_679a9e435f1af95a94d9749a087" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_service_plans_code" ON "service_plans" ("code") `);
        await queryRunner.query(`CREATE TABLE "plan_orders" ("id" int NOT NULL IDENTITY(1,1), "created_at" datetime2 NOT NULL CONSTRAINT "DF_f08efce24fa1dc64e8c21d40830" DEFAULT getdate(), "updated_at" datetime2 NOT NULL CONSTRAINT "DF_e2cfa7c178db1d024242f4edf79" DEFAULT getdate(), "code" nvarchar(20) NOT NULL, "company_id" int NOT NULL, "plan_id" int NOT NULL, "plan_name" nvarchar(100) NOT NULL, "amount" decimal(18,0) NOT NULL, "duration_days" int NOT NULL, "featured_credits" int NOT NULL, "contact_credits" int NOT NULL, "status" nvarchar(10) CONSTRAINT CHK_66ca5d5a651befb64d4165f148_ENUM CHECK(status IN ('PENDING','PAID','CANCELLED')) NOT NULL CONSTRAINT "DF_ca9ef8809edac89d79e23db5daa" DEFAULT 'PENDING', "created_by_id" int NOT NULL, "paid_at" datetime2, "confirmed_by_id" int, "cancel_reason" nvarchar(500), CONSTRAINT "PK_a77338bf87e337a781456535d44" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_plan_orders_code" ON "plan_orders" ("code") `);
        await queryRunner.query(`CREATE INDEX "IX_plan_orders_company" ON "plan_orders" ("company_id") `);
        await queryRunner.query(`CREATE INDEX "IX_plan_orders_status" ON "plan_orders" ("status") `);
        await queryRunner.query(`CREATE TABLE "candidate_unlocks" ("id" int NOT NULL IDENTITY(1,1), "company_id" int NOT NULL, "candidate_id" int NOT NULL, "unlocked_by_id" int NOT NULL, "created_at" datetime2 NOT NULL CONSTRAINT "DF_b18c82e488da5d5bfae12490624" DEFAULT getdate(), CONSTRAINT "PK_e6be851f23e58379fc89405b7a7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_candidate_unlocks_company_candidate" ON "candidate_unlocks" ("company_id", "candidate_id") `);
        await queryRunner.query(`ALTER TABLE "jobs" ADD "featured_until" datetime2`);
        await queryRunner.query(`ALTER TABLE "companies" ADD "plan_name" nvarchar(100)`);
        await queryRunner.query(`ALTER TABLE "companies" ADD "plan_expires_at" datetime2`);
        await queryRunner.query(`ALTER TABLE "companies" ADD "featured_credits" int NOT NULL CONSTRAINT "DF_720fff8f618293dfc4ab7a8a855" DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE "companies" ADD "contact_credits" int NOT NULL CONSTRAINT "DF_4e4a1a0224981d5aa862a5db0e5" DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE "candidate_profiles" ADD "cv_settings" ntext`);
        await queryRunner.query(`ALTER TABLE "applications" ADD "last_message_at" datetime2`);
        await queryRunner.query(`ALTER TABLE "applications" ADD "employer_read_at" datetime2`);
        await queryRunner.query(`ALTER TABLE "applications" ADD "candidate_read_at" datetime2`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "CHK_3e470bb199ccc56b65c8289d9c_ENUM"`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "CHK_6a5ebb37fabe9481ac30e0ef15_ENUM" CHECK (type IN ('APPLICATION_STATUS','NEW_APPLICATION','JOB_APPROVED','JOB_REJECTED','COMPANY_VERIFIED','COMPANY_REJECTED','JOB_ALERT','NEW_MESSAGE','REVIEW_APPROVED','REVIEW_REJECTED','ORDER_PAID','ORDER_CANCELLED','SYSTEM'))`);
        await queryRunner.query(`CREATE INDEX "IX_jobs_featured_until" ON "jobs" ("featured_until") `);
        await queryRunner.query(`CREATE INDEX "IX_applications_last_message" ON "applications" ("last_message_at") `);
        await queryRunner.query(`ALTER TABLE "company_reviews" ADD CONSTRAINT "FK_company_reviews_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "company_reviews" ADD CONSTRAINT "FK_company_reviews_candidate" FOREIGN KEY ("candidate_id") REFERENCES "candidate_profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "application_messages" ADD CONSTRAINT "FK_application_messages_application" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "application_messages" ADD CONSTRAINT "FK_application_messages_sender" FOREIGN KEY ("sender_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "plan_orders" ADD CONSTRAINT "FK_plan_orders_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "plan_orders" ADD CONSTRAINT "FK_plan_orders_plan" FOREIGN KEY ("plan_id") REFERENCES "service_plans"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "candidate_unlocks" ADD CONSTRAINT "FK_candidate_unlocks_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "candidate_unlocks" ADD CONSTRAINT "FK_candidate_unlocks_candidate" FOREIGN KEY ("candidate_id") REFERENCES "candidate_profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "candidate_unlocks" DROP CONSTRAINT "FK_candidate_unlocks_candidate"`);
        await queryRunner.query(`ALTER TABLE "candidate_unlocks" DROP CONSTRAINT "FK_candidate_unlocks_company"`);
        await queryRunner.query(`ALTER TABLE "plan_orders" DROP CONSTRAINT "FK_plan_orders_plan"`);
        await queryRunner.query(`ALTER TABLE "plan_orders" DROP CONSTRAINT "FK_plan_orders_company"`);
        await queryRunner.query(`ALTER TABLE "application_messages" DROP CONSTRAINT "FK_application_messages_sender"`);
        await queryRunner.query(`ALTER TABLE "application_messages" DROP CONSTRAINT "FK_application_messages_application"`);
        await queryRunner.query(`ALTER TABLE "company_reviews" DROP CONSTRAINT "FK_company_reviews_candidate"`);
        await queryRunner.query(`ALTER TABLE "company_reviews" DROP CONSTRAINT "FK_company_reviews_company"`);
        await queryRunner.query(`DROP INDEX "IX_applications_last_message" ON "applications"`);
        await queryRunner.query(`DROP INDEX "IX_jobs_featured_until" ON "jobs"`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "CHK_3e470bb199ccc56b65c8289d9c_ENUM" CHECK (type IN ('APPLICATION_STATUS','NEW_APPLICATION','JOB_APPROVED','JOB_REJECTED','COMPANY_VERIFIED','COMPANY_REJECTED','JOB_ALERT','SYSTEM'))`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "CHK_6a5ebb37fabe9481ac30e0ef15_ENUM"`);
        await queryRunner.query(`ALTER TABLE "applications" DROP COLUMN "candidate_read_at"`);
        await queryRunner.query(`ALTER TABLE "applications" DROP COLUMN "employer_read_at"`);
        await queryRunner.query(`ALTER TABLE "applications" DROP COLUMN "last_message_at"`);
        await queryRunner.query(`ALTER TABLE "candidate_profiles" DROP COLUMN "cv_settings"`);
        await queryRunner.query(`ALTER TABLE "companies" DROP CONSTRAINT "DF_4e4a1a0224981d5aa862a5db0e5"`);
        await queryRunner.query(`ALTER TABLE "companies" DROP COLUMN "contact_credits"`);
        await queryRunner.query(`ALTER TABLE "companies" DROP CONSTRAINT "DF_720fff8f618293dfc4ab7a8a855"`);
        await queryRunner.query(`ALTER TABLE "companies" DROP COLUMN "featured_credits"`);
        await queryRunner.query(`ALTER TABLE "companies" DROP COLUMN "plan_expires_at"`);
        await queryRunner.query(`ALTER TABLE "companies" DROP COLUMN "plan_name"`);
        await queryRunner.query(`ALTER TABLE "jobs" DROP COLUMN "featured_until"`);
        await queryRunner.query(`DROP INDEX "UQ_candidate_unlocks_company_candidate" ON "candidate_unlocks"`);
        await queryRunner.query(`DROP TABLE "candidate_unlocks"`);
        await queryRunner.query(`DROP INDEX "IX_plan_orders_status" ON "plan_orders"`);
        await queryRunner.query(`DROP INDEX "IX_plan_orders_company" ON "plan_orders"`);
        await queryRunner.query(`DROP INDEX "UQ_plan_orders_code" ON "plan_orders"`);
        await queryRunner.query(`DROP TABLE "plan_orders"`);
        await queryRunner.query(`DROP INDEX "UQ_service_plans_code" ON "service_plans"`);
        await queryRunner.query(`DROP TABLE "service_plans"`);
        await queryRunner.query(`DROP INDEX "IX_application_messages_app" ON "application_messages"`);
        await queryRunner.query(`DROP TABLE "application_messages"`);
        await queryRunner.query(`DROP INDEX "UQ_company_reviews_company_candidate" ON "company_reviews"`);
        await queryRunner.query(`DROP INDEX "IX_company_reviews_company_status" ON "company_reviews"`);
        await queryRunner.query(`DROP INDEX "IX_company_reviews_status" ON "company_reviews"`);
        await queryRunner.query(`DROP TABLE "company_reviews"`);
    }

}
