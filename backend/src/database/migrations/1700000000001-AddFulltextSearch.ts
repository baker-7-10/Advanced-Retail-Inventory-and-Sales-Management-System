import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFulltextSearch1700000000001 implements MigrationInterface {
  name = 'AddFulltextSearch1700000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if index already exists to make migration idempotent
    const indexExists = await queryRunner.query(`
      SELECT COUNT(*) as count 
      FROM INFORMATION_SCHEMA.STATISTICS 
      WHERE TABLE_SCHEMA = 'retail_db' 
      AND TABLE_NAME = 'products' 
      AND INDEX_NAME = 'IDX_products_name_description_fulltext'
    `);
    
    if (indexExists[0].count === 0) {
      await queryRunner.query(
        `CREATE FULLTEXT INDEX \`IDX_products_name_description_fulltext\` ON \`products\` (\`name\`, \`description\`)`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Check if index exists before dropping
    const indexExists = await queryRunner.query(`
      SELECT COUNT(*) as count 
      FROM INFORMATION_SCHEMA.STATISTICS 
      WHERE TABLE_SCHEMA = 'retail_db' 
      AND TABLE_NAME = 'products' 
      AND INDEX_NAME = 'IDX_products_name_description_fulltext'
    `);
    
    if (indexExists[0].count > 0) {
      await queryRunner.query(
        `DROP INDEX \`IDX_products_name_description_fulltext\` ON \`products\``,
      );
    }
  }
}
