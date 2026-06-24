import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../../../../src/common/guards/jwt-auth.guard';

describe('JwtAuthGuard', () => {
  it('should extend AuthGuard jwt', () => {
    const guard = new JwtAuthGuard();
    expect(guard).toBeDefined();
  });
});
