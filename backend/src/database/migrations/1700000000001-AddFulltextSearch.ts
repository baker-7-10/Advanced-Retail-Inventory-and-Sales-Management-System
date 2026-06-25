import { MigrationInterface, QueryRunner } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';

config({ path: join(__dirname, '..', '..', '..', '.env') });

const DB_NAME = process.env.DB_NAME || 'retail_db';
const INDEX_NAME = 'IDX_products_name_description_fulltext';

export class AddFulltextSearch1700000000001 implements MigrationInterface {
  name = 'AddFulltextSearch1700000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const indexExists = await queryRunner.query(`
      SELECT COUNT(*) as count 
      FROM INFORMATION_SCHEMA.STATISTICS 
      WHERE TABLE_SCHEMA = '${DB_NAME}' 
      AND TABLE_NAME = 'products' 
      AND INDEX_NAME = '${INDEX_NAME}'
    `);

    if (indexExists[0].count === 0) {
      await queryRunner.query(
        `CREATE FULLTEXT INDEX \`${INDEX_NAME}\` ON \`products\` (\`name\`, \`description\`, \`sku\`)`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const indexExists = await queryRunner.query(`
      SELECT COUNT(*) as count 
      FROM INFORMATION_SCHEMA.STATISTICS 
      WHERE TABLE_SCHEMA = '${DB_NAME}' 
      AND TABLE_NAME = 'products' 
      AND INDEX_NAME = '${INDEX_NAME}'
    `);

    if (indexExists[0].count > 0) {
      await queryRunner.query(
        `DROP INDEX \`${INDEX_NAME}\` ON \`products\``,
      );
    }
  }
}
