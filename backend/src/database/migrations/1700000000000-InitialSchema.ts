import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1700000000000 implements MigrationInterface {
  name = 'InitialSchema1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`users\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`name\` varchar(100) NOT NULL,
        \`email\` varchar(150) NOT NULL,
        \`password\` varchar(255) NOT NULL,
        \`role\` enum ('admin', 'manager', 'employee') NOT NULL DEFAULT 'employee',
        \`isActive\` tinyint NOT NULL DEFAULT 1,
        \`failedLoginAttempts\` int NOT NULL DEFAULT 0,
        \`lockedUntil\` timestamp NULL DEFAULT NULL,
        \`hashedRefreshToken\` varchar(255) NULL DEFAULT NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_users_email\` ON \`users\` (\`email\`)`,
    );
    await queryRunner.query(
      `CREATE INDEX \`IDX_users_role_is_active\` ON \`users\` (\`role\`, \`isActive\`)`,
    );

    await queryRunner.query(
      `CREATE TABLE \`categories\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`name\` varchar(100) NOT NULL,
        \`description\` text NULL,
        \`isActive\` tinyint NOT NULL DEFAULT 1,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_categories_name\` ON \`categories\` (\`name\`)`,
    );

    await queryRunner.query(
      `CREATE TABLE \`products\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`name\` varchar(200) NOT NULL,
        \`description\` text NULL,
        \`price\` decimal(10,2) NOT NULL,
        \`sku\` varchar(100) NULL,
        \`isActive\` tinyint NOT NULL DEFAULT 1,
        \`categoryId\` int NOT NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE INDEX \`IDX_products_name\` ON \`products\` (\`name\`)`,
    );
    await queryRunner.query(
      `CREATE INDEX \`IDX_products_price\` ON \`products\` (\`price\`)`,
    );
    await queryRunner.query(
      `CREATE INDEX \`IDX_products_sku\` ON \`products\` (\`sku\`)`,
    );
    await queryRunner.query(
      `CREATE INDEX \`IDX_products_categoryId\` ON \`products\` (\`categoryId\`)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`products\` ADD CONSTRAINT \`FK_products_categoryId\` FOREIGN KEY (\`categoryId\`) REFERENCES \`categories\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `CREATE TABLE \`inventory\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`productId\` int NOT NULL,
        \`quantity\` int NOT NULL DEFAULT 0,
        \`minimumStock\` int NOT NULL DEFAULT 10,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_inventory_productId\` ON \`inventory\` (\`productId\`)`,
    );
    await queryRunner.query(
      `CREATE INDEX \`IDX_inventory_quantity\` ON \`inventory\` (\`quantity\`)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`inventory\` ADD CONSTRAINT \`FK_inventory_productId\` FOREIGN KEY (\`productId\`) REFERENCES \`products\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `CREATE TABLE \`sales\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`invoiceNumber\` varchar(50) NOT NULL,
        \`subtotal\` decimal(10,2) NOT NULL DEFAULT 0,
        \`discountPercent\` decimal(5,2) NOT NULL DEFAULT 0,
        \`discountAmount\` decimal(10,2) NOT NULL DEFAULT 0,
        \`total\` decimal(10,2) NOT NULL,
        \`paymentMethod\` enum ('CASH', 'CARD', 'TRANSFER') NOT NULL DEFAULT 'CASH',
        \`status\` enum ('pending', 'completed', 'cancelled', 'refunded') NOT NULL DEFAULT 'pending',
        \`notes\` text NULL,
        \`userId\` int NOT NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_sales_invoiceNumber\` ON \`sales\` (\`invoiceNumber\`)`,
    );
    await queryRunner.query(
      `CREATE INDEX \`IDX_sales_status\` ON \`sales\` (\`status\`)`,
    );
    await queryRunner.query(
      `CREATE INDEX \`IDX_sales_createdAt\` ON \`sales\` (\`createdAt\`)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`sales\` ADD CONSTRAINT \`FK_sales_userId\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `CREATE TABLE \`sale_items\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`saleId\` int NOT NULL,
        \`productId\` int NOT NULL,
        \`quantity\` int NOT NULL,
        \`unitPrice\` decimal(10,2) NOT NULL,
        \`subtotal\` decimal(10,2) NOT NULL,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE INDEX \`IDX_sale_items_productId\` ON \`sale_items\` (\`productId\`)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`sale_items\` ADD CONSTRAINT \`FK_sale_items_saleId\` FOREIGN KEY (\`saleId\`) REFERENCES \`sales\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`sale_items\` ADD CONSTRAINT \`FK_sale_items_productId\` FOREIGN KEY (\`productId\`) REFERENCES \`products\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`sale_items\` DROP FOREIGN KEY \`FK_sale_items_productId\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`sale_items\` DROP FOREIGN KEY \`FK_sale_items_saleId\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`sales\` DROP FOREIGN KEY \`FK_sales_userId\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`inventory\` DROP FOREIGN KEY \`FK_inventory_productId\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`products\` DROP FOREIGN KEY \`FK_products_categoryId\``,
    );
    await queryRunner.query(`DROP TABLE \`sale_items\``);
    await queryRunner.query(`DROP TABLE \`sales\``);
    await queryRunner.query(`DROP TABLE \`inventory\``);
    await queryRunner.query(`DROP TABLE \`products\``);
    await queryRunner.query(`DROP TABLE \`categories\``);
    await queryRunner.query(`DROP TABLE \`users\``);
  }
}
