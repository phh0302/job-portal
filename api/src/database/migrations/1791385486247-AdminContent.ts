import { MigrationInterface, QueryRunner } from "typeorm";

export class AdminContent1791385486247 implements MigrationInterface {
    name = 'AdminContent1791385486247'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "static_pages" ("id" int NOT NULL IDENTITY(1,1), "created_at" datetime2 NOT NULL CONSTRAINT "DF_c71ecedd7800e5b6db85bfe2786" DEFAULT getdate(), "updated_at" datetime2 NOT NULL CONSTRAINT "DF_4522ea517b02b5d9c43a4ab2686" DEFAULT getdate(), "slug" nvarchar(100) NOT NULL, "title" nvarchar(200) NOT NULL, "content" nvarchar(MAX) NOT NULL, "is_published" bit NOT NULL CONSTRAINT "DF_bbc29a2986e5afdb36e90a027c7" DEFAULT 1, "updated_by_id" int, CONSTRAINT "PK_51d5188719a3fb65679933415ad" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_static_pages_slug" ON "static_pages" ("slug") `);
        await queryRunner.query(`CREATE TABLE "settings" ("key" nvarchar(100) NOT NULL, "value" nvarchar(MAX) NOT NULL, "updated_at" datetime2 NOT NULL CONSTRAINT "DF_81388e904dd40892f0f7d549089" DEFAULT getdate(), CONSTRAINT "PK_c8639b7626fa94ba8265628f214" PRIMARY KEY ("key"))`);
        await queryRunner.query(`ALTER TABLE "users" ADD "is_super_admin" bit NOT NULL CONSTRAINT "DF_2597666fe7aa50591abdc204ed4" DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE "users" ADD "locked_reason" nvarchar(500)`);
        await queryRunner.query(`ALTER TABLE "static_pages" ADD CONSTRAINT "FK_static_pages_updated_by" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_pages" DROP CONSTRAINT "FK_static_pages_updated_by"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "locked_reason"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "DF_2597666fe7aa50591abdc204ed4"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "is_super_admin"`);
        await queryRunner.query(`DROP TABLE "settings"`);
        await queryRunner.query(`DROP INDEX "UQ_static_pages_slug" ON "static_pages"`);
        await queryRunner.query(`DROP TABLE "static_pages"`);
    }

}
