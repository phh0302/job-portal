import { MigrationInterface, QueryRunner } from "typeorm";

export class SchemaUpdate1791557152208 implements MigrationInterface {
    name = 'SchemaUpdate1791557152208'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "support_tickets" ("id" int NOT NULL IDENTITY(1,1), "created_at" datetime2 NOT NULL CONSTRAINT "DF_82013b41f4246f8f0c432bf55ae" DEFAULT getdate(), "updated_at" datetime2 NOT NULL CONSTRAINT "DF_a08323192c97ebd285166e538a9" DEFAULT getdate(), "user_id" int NOT NULL, "status" nvarchar(10) CONSTRAINT CHK_09368140c39cfd9868948bbc24_ENUM CHECK(status IN ('BOT','WAITING','OPEN','CLOSED')) NOT NULL CONSTRAINT "DF_ba7b1a2ed4051fb3b39ff954445" DEFAULT 'BOT', "subject" nvarchar(200) NOT NULL, "assigned_admin_id" int, "last_message_at" datetime2 NOT NULL, "user_read_at" datetime2, "admin_read_at" datetime2, "escalated_at" datetime2, "closed_at" datetime2, CONSTRAINT "PK_942e8d8f5df86100471d2324643" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IX_support_tickets_user" ON "support_tickets" ("user_id") `);
        await queryRunner.query(`CREATE INDEX "IX_support_tickets_status_last" ON "support_tickets" ("status", "last_message_at") `);
        await queryRunner.query(`CREATE TABLE "support_messages" ("id" int NOT NULL IDENTITY(1,1), "ticket_id" int NOT NULL, "sender_type" nvarchar(10) CONSTRAINT CHK_0dde029b9ce5403faeb3e48dea_ENUM CHECK(sender_type IN ('USER','BOT','ADMIN','SYSTEM')) NOT NULL, "sender_user_id" int, "body" nvarchar(4000) NOT NULL, "faq_ids" nvarchar(200), "created_at" datetime2 NOT NULL CONSTRAINT "DF_40ac2e4631a0dc085a87964d36f" DEFAULT getdate(), CONSTRAINT "PK_2aa37479e71ef29cbf4dba2b1a2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IX_support_messages_ticket" ON "support_messages" ("ticket_id", "id") `);
        await queryRunner.query(`CREATE TABLE "faq_articles" ("id" int NOT NULL IDENTITY(1,1), "created_at" datetime2 NOT NULL CONSTRAINT "DF_bc7fcc4b6a098fbf7677c926fe2" DEFAULT getdate(), "updated_at" datetime2 NOT NULL CONSTRAINT "DF_ebd69b2578b3178f18e9dfaadb9" DEFAULT getdate(), "question" nvarchar(300) NOT NULL, "answer" nvarchar(4000) NOT NULL, "keywords" nvarchar(500), "audience" nvarchar(10) CONSTRAINT CHK_ca2d0e02a54add31f808939fd4_ENUM CHECK(audience IN ('ALL','CANDIDATE','EMPLOYER')) NOT NULL CONSTRAINT "DF_e7b019309e8b718a1bb64cbf922" DEFAULT 'ALL', "is_active" bit NOT NULL CONSTRAINT "DF_14d75da2a86c73b2f12f0fa4f40" DEFAULT 1, "sort_order" int NOT NULL CONSTRAINT "DF_a6b9101b23efcf3cf30472b196c" DEFAULT 0, CONSTRAINT "PK_99b16ca1ec8f9427aa8e0a69ab8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "CHK_6a5ebb37fabe9481ac30e0ef15_ENUM"`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "CHK_5f183955888e75a77c025417c2_ENUM" CHECK (type IN ('APPLICATION_STATUS','NEW_APPLICATION','JOB_APPROVED','JOB_REJECTED','COMPANY_VERIFIED','COMPANY_REJECTED','JOB_ALERT','NEW_MESSAGE','REVIEW_APPROVED','REVIEW_REJECTED','ORDER_PAID','ORDER_CANCELLED','SUPPORT','SYSTEM'))`);
        await queryRunner.query(`ALTER TABLE "support_tickets" ADD CONSTRAINT "FK_support_tickets_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "support_messages" ADD CONSTRAINT "FK_support_messages_ticket" FOREIGN KEY ("ticket_id") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "support_messages" DROP CONSTRAINT "FK_support_messages_ticket"`);
        await queryRunner.query(`ALTER TABLE "support_tickets" DROP CONSTRAINT "FK_support_tickets_user"`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "CHK_6a5ebb37fabe9481ac30e0ef15_ENUM" CHECK (type IN ('APPLICATION_STATUS','NEW_APPLICATION','JOB_APPROVED','JOB_REJECTED','COMPANY_VERIFIED','COMPANY_REJECTED','JOB_ALERT','NEW_MESSAGE','REVIEW_APPROVED','REVIEW_REJECTED','ORDER_PAID','ORDER_CANCELLED','SYSTEM'))`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "CHK_5f183955888e75a77c025417c2_ENUM"`);
        await queryRunner.query(`DROP TABLE "faq_articles"`);
        await queryRunner.query(`DROP INDEX "IX_support_messages_ticket" ON "support_messages"`);
        await queryRunner.query(`DROP TABLE "support_messages"`);
        await queryRunner.query(`DROP INDEX "IX_support_tickets_status_last" ON "support_tickets"`);
        await queryRunner.query(`DROP INDEX "IX_support_tickets_user" ON "support_tickets"`);
        await queryRunner.query(`DROP TABLE "support_tickets"`);
    }

}
