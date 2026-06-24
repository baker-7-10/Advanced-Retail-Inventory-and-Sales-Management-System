import { Test, TestingModule } from '@nestjs/testing';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InventoryGateway } from '../../../src/inventory/inventory.gateway';
import { UserRole } from '../../../src/users/entities/user.entity';

function mockSocket(overrides: Partial<Socket> = {}): jest.Mocked<Socket> {
  return {
    id: 'test-socket-id',
    handshake: { auth: {}, headers: {}, ...overrides.handshake } as any,
    data: {},
    join: jest.fn(),
    leave: jest.fn(),
    disconnect: jest.fn(),
    emit: jest.fn(),
    to: jest.fn().mockReturnThis(),
    ...overrides,
  } as unknown as jest.Mocked<Socket>;
}

function mockServer(): jest.Mocked<Server> {
  const server = {
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
  } as unknown as jest.Mocked<Server>;
  (server.to as jest.Mock).mockReturnValue(server);
  return server;
}

describe('InventoryGateway', () => {
  let gateway: InventoryGateway;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;
  let server: jest.Mocked<Server>;

  beforeEach(async () => {
    jwtService = {
      verify: jest.fn(),
      sign: jest.fn(),
      signAsync: jest.fn(),
      verifyAsync: jest.fn(),
      decode: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;

    configService = {
      get: jest.fn(),
    } as unknown as jest.Mocked<ConfigService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryGateway,
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    gateway = module.get<InventoryGateway>(InventoryGateway);

    server = mockServer();
    gateway.server = server;
  });

  describe('Authentication', () => {
    it('should connect with valid token', async () => {
      const client = mockSocket({
        handshake: { auth: { token: 'valid-jwt' }, headers: {} } as any,
      });
      configService.get.mockReturnValue('test-secret');
      jwtService.verify.mockReturnValue({ sub: 1, role: UserRole.ADMIN });

      await gateway.handleConnection(client);

      expect(configService.get).toHaveBeenCalledWith('ACCESS_TOKEN_SECRET');
      expect(jwtService.verify).toHaveBeenCalledWith('valid-jwt', { secret: 'test-secret' });
      expect(client.data.userId).toBe(1);
      expect(client.data.role).toBe(UserRole.ADMIN);
      expect(client.join).toHaveBeenCalledWith('inventory-room');
      expect(client.disconnect).not.toHaveBeenCalled();
    });

    it('should disconnect with invalid token', async () => {
      const client = mockSocket({
        handshake: { auth: { token: 'bad-jwt' }, headers: {} } as any,
      });
      configService.get.mockReturnValue('test-secret');
      jwtService.verify.mockImplementation(() => { throw new Error('jwt malformed'); });

      await gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalled();
      expect(client.join).not.toHaveBeenCalled();
    });

    it('should disconnect when token is missing', async () => {
      const client = mockSocket({
        handshake: { auth: {}, headers: {} } as any,
      });

      await gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalled();
      expect(jwtService.verify).not.toHaveBeenCalled();
      expect(client.join).not.toHaveBeenCalled();
    });
  });

  describe('Authorization', () => {
    it('should allow ADMIN role', async () => {
      const client = mockSocket({
        handshake: { auth: { token: 'admin-jwt' }, headers: {} } as any,
      });
      configService.get.mockReturnValue('test-secret');
      jwtService.verify.mockReturnValue({ sub: 1, role: UserRole.ADMIN });

      await gateway.handleConnection(client);

      expect(client.join).toHaveBeenCalledWith('inventory-room');
      expect(client.disconnect).not.toHaveBeenCalled();
    });

    it('should allow MANAGER role', async () => {
      const client = mockSocket({
        handshake: { auth: { token: 'mgr-jwt' }, headers: {} } as any,
      });
      configService.get.mockReturnValue('test-secret');
      jwtService.verify.mockReturnValue({ sub: 2, role: UserRole.MANAGER });

      await gateway.handleConnection(client);

      expect(client.join).toHaveBeenCalledWith('inventory-room');
      expect(client.disconnect).not.toHaveBeenCalled();
    });

    it('should disconnect EMPLOYEE role', async () => {
      const client = mockSocket({
        handshake: { auth: { token: 'emp-jwt' }, headers: {} } as any,
      });
      configService.get.mockReturnValue('test-secret');
      jwtService.verify.mockReturnValue({ sub: 3, role: UserRole.EMPLOYEE });

      await gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalled();
      expect(client.join).not.toHaveBeenCalled();
    });
  });

  describe('Room Management', () => {
    it('should join product room on watch-product', () => {
      const client = mockSocket();
      gateway.handleWatchProduct(client, 42);

      expect(client.join).toHaveBeenCalledWith('product-42');
    });

    it('should leave product room on unwatch-product', () => {
      const client = mockSocket();
      gateway.handleUnwatchProduct(client, 42);

      expect(client.leave).toHaveBeenCalledWith('product-42');
    });
  });

  describe('Inventory Events', () => {
    it('should emit stockUpdated with standard payload', () => {
      const toSpy = jest.spyOn(server, 'to').mockReturnValue(server as any);
      const emitSpy = jest.spyOn(server, 'emit');

      gateway.emitStockUpdate(1, 50);

      expect(toSpy).toHaveBeenCalledWith('inventory-room');
      expect(emitSpy).toHaveBeenCalledWith(
        'stockUpdated',
        expect.objectContaining({
          productId: 1,
          quantity: 50,
          timestamp: expect.any(String),
        }),
      );
    });

    it('should not emit stock-update (legacy event removed)', () => {
      const emitSpy = jest.spyOn(server, 'emit');
      jest.spyOn(server, 'to').mockReturnValue(server as any);

      gateway.emitStockUpdate(1, 50);

      const emittedEvents = emitSpy.mock.calls.map((c) => c[0]);
      expect(emittedEvents).not.toContain('stock-update');
    });
  });

  describe('Error Handling', () => {
    it('should not crash on handleWatchProduct with missing productId', () => {
      const client = mockSocket();
      expect(() => gateway.handleWatchProduct(client, undefined as any)).not.toThrow();
    });

    it('should not crash on emitStockUpdate with zero quantity', () => {
      const emitSpy = jest.spyOn(server, 'emit');
      jest.spyOn(server, 'to').mockReturnValue(server as any);

      expect(() => gateway.emitStockUpdate(1, 0)).not.toThrow();
      expect(emitSpy).toHaveBeenCalled();
    });

    it('should not crash on handleDisconnect', () => {
      const client = mockSocket();
      expect(() => gateway.handleDisconnect(client)).not.toThrow();
    });

    it('should extract token from authorization header', async () => {
      const client = mockSocket({
        handshake: {
          auth: {},
          headers: { authorization: 'Bearer header-token' },
        } as any,
      });
      configService.get.mockReturnValue('test-secret');
      jwtService.verify.mockReturnValue({ sub: 1, role: UserRole.ADMIN });

      await gateway.handleConnection(client);

      expect(jwtService.verify).toHaveBeenCalledWith('header-token', expect.any(Object));
    });
  });
});
