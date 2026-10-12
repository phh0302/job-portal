import { MigrationInterface, QueryRunner } from "typeorm";

export class SchemaUpdate1791552430431 implements MigrationInterface {
    name = 'SchemaUpdate1791552430431'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "companies" ADD "response_rate" tinyint`);
        await queryRunner.query(`ALTER TABLE "companies" ADD "avg_response_hours" int`);
        await queryRunner.query(`ALTER TABLE "companies" ADD "response_sample" int NOT NULL CONSTRAINT "DF_f8359a01cf734bcbdc941748bd1" DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE "companies" ADD "response_reminded_at" datetime2`);
        await queryRunner.query(`ALTER TABLE "applications" ADD "responded_at" datetime2`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "applications" DROP COLUMN "responded_at"`);
        await queryRunner.query(`ALTER TABLE "companies" DROP COLUMN "response_reminded_at"`);
        await queryRunner.query(`ALTER TABLE "companies" DROP CONSTRAINT "DF_f8359a01cf734bcbdc941748bd1"`);
        await queryRunner.query(`ALTER TABLE "companies" DROP COLUMN "response_sample"`);
        await queryRunner.query(`ALTER TABLE "companies" DROP COLUMN "avg_response_hours"`);
        await queryRunner.query(`ALTER TABLE "companies" DROP COLUMN "response_rate"`);
    }

}
