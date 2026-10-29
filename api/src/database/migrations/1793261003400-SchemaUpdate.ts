import { MigrationInterface, QueryRunner } from "typeorm";

export class SchemaUpdate1793261003400 implements MigrationInterface {
    name = 'SchemaUpdate1793261003400'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "cv_screenings" ("id" int NOT NULL IDENTITY(1,1), "application_id" int NOT NULL, "company_id" int NOT NULL, "score" tinyint NOT NULL, "verdict" nvarchar(10) CONSTRAINT CHK_198326ffb63f3b08b41d036d64_ENUM CHECK(verdict IN ('STRONG','POTENTIAL','WEAK')) NOT NULL, "summary" nvarchar(1000) NOT NULL, "requirements" ntext NOT NULL, "strengths" ntext NOT NULL, "gaps" ntext NOT NULL, "interview_questions" ntext NOT NULL, "source" nvarchar(10) NOT NULL, "cv_readable" bit NOT NULL CONSTRAINT "DF_07d61e0b2225fc994ec93b2b281" DEFAULT 1, "model" nvarchar(60), "created_by_id" int NOT NULL, "created_at" datetime2 NOT NULL CONSTRAINT "DF_4fdc372128956a8a69a48da19f4" DEFAULT getdate(), CONSTRAINT "PK_6641a8aaf07cef82aabba1fb081" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IX_cv_screenings_company_created" ON "cv_screenings" ("company_id", "created_at") `);
        await queryRunner.query(`CREATE INDEX "IX_cv_screenings_app" ON "cv_screenings" ("application_id", "id") `);
        await queryRunner.query(`CREATE TABLE "cv_job_checks" ("id" int NOT NULL IDENTITY(1,1), "candidate_id" int NOT NULL, "job_id" int NOT NULL, "resume_id" int, "input_hash" char(64) NOT NULL, "score" tinyint NOT NULL, "result" ntext NOT NULL, "created_at" datetime2 NOT NULL CONSTRAINT "DF_7111f40a4b61a0b8ddd4493910a" DEFAULT getdate(), CONSTRAINT "PK_85056eb16f4d58f23a3e8420da8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IX_cv_job_checks_lookup" ON "cv_job_checks" ("candidate_id", "input_hash") `);
        await queryRunner.query(`CREATE INDEX "IX_cv_job_checks_candidate_created" ON "cv_job_checks" ("candidate_id", "created_at") `);
        await queryRunner.query(`ALTER TABLE "cv_screenings" ADD CONSTRAINT "FK_cv_screenings_application" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "cv_job_checks" ADD CONSTRAINT "FK_cv_job_checks_candidate" FOREIGN KEY ("candidate_id") REFERENCES "candidate_profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "cv_job_checks" DROP CONSTRAINT "FK_cv_job_checks_candidate"`);
        await queryRunner.query(`ALTER TABLE "cv_screenings" DROP CONSTRAINT "FK_cv_screenings_application"`);
        await queryRunner.query(`DROP INDEX "IX_cv_job_checks_candidate_created" ON "cv_job_checks"`);
        await queryRunner.query(`DROP INDEX "IX_cv_job_checks_lookup" ON "cv_job_checks"`);
        await queryRunner.query(`DROP TABLE "cv_job_checks"`);
        await queryRunner.query(`DROP INDEX "IX_cv_screenings_app" ON "cv_screenings"`);
        await queryRunner.query(`DROP INDEX "IX_cv_screenings_company_created" ON "cv_screenings"`);
        await queryRunner.query(`DROP TABLE "cv_screenings"`);
    }

}
