import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUniqueIndexOnInventoryProductId1782205448695 implements MigrationInterface {
  name = 'AddUniqueIndexOnInventoryProductId1782205448695';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_inventory_productId` ON `inventory` (`productId`)',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX `IDX_inventory_productId` ON `inventory`');
  }
}
