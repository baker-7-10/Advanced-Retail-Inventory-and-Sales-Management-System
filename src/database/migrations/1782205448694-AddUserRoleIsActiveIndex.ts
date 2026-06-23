import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserRoleIsActiveIndex1782205448694 implements MigrationInterface {
  name = 'AddUserRoleIsActiveIndex1782205448694';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE INDEX `IDX_users_role_is_active` ON `users` (`role`, `isActive`)',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX `IDX_users_role_is_active` ON `users`');
  }
}
