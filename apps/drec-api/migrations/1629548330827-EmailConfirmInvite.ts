import { MigrationInterface, QueryRunner } from 'typeorm';

export class EmailConfirmInvite1629548330827 implements MigrationInterface {
  name = 'EmailConfirmInvite1629548330827';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "organization_invitation" ("createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "id" SERIAL NOT NULL, "email" character varying NOT NULL, "role" character varying NOT NULL DEFAULT 'OrganizationUser', "status" character varying NOT NULL, "sender" character varying NOT NULL, "organizationId" integer, CONSTRAINT "PK_cc1ac752952740b92ead1ee9249" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "email_confirmation" ("createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "id" SERIAL NOT NULL, "confirmed" boolean NOT NULL, "token" character varying NOT NULL, "expiryTimestamp" integer NOT NULL, "userId" integer, CONSTRAINT "REL_28d3d3fbd7503f3428b94fd18c" UNIQUE ("userId"), CONSTRAINT "PK_ff2b80a46c3992a0046b07c5456" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_invitation" ADD CONSTRAINT "FK_58d9ca5d9f882ad8be530d247f1" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "email_confirmation" ADD CONSTRAINT "FK_28d3d3fbd7503f3428b94fd18cc" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "email_confirmation" DROP CONSTRAINT "FK_28d3d3fbd7503f3428b94fd18cc"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_invitation" DROP CONSTRAINT "FK_58d9ca5d9f882ad8be530d247f1"`,
    );
    await queryRunner.query(`DROP TABLE "email_confirmation"`);
    await queryRunner.query(`DROP TABLE "organization_invitation"`);
  }
}
