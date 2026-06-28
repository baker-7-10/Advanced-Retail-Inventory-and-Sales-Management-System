import {
  WebSocketGateway, WebSocketServer,
  SubscribeMessage, OnGatewayConnection,
  OnGatewayDisconnect, OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '../users/entities/user.entity';

@WebSocketGateway()
export class InventoryGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(InventoryGateway.name);

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  afterInit(_server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.split(' ')[1];

      if (!token) {
        client.disconnect();
        return;
      }

      const secret = this.configService.get<string>('ACCESS_TOKEN_SECRET');
      const payload = this.jwtService.verify(token, { secret });
      client.data.userId = payload.sub;
      client.data.role = payload.role;

      const allowedRoles: UserRole[] = [UserRole.ADMIN, UserRole.MANAGER];
      if (!allowedRoles.includes(payload.role)) {
        this.logger.warn(`WebSocket role denied: ${payload.role} (Client: ${client.id})`);
        client.disconnect();
        return;
      }

      this.logger.log(`Client connected: ${client.id} (User: ${payload.sub}, Role: ${payload.role})`);

      client.join('inventory-room');
    } catch {
      this.logger.warn(`Unauthorized WebSocket connection: ${client.id}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  emitStockUpdate(productId: number, stock: number) {
    this.server.to('inventory-room').emit('stockUpdated', {
      productId,
      quantity: stock,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`Stock update emitted: Product ${productId} -> ${stock} units`);
  }

  @SubscribeMessage('watch-product')
  handleWatchProduct(client: Socket, productId: number) {
    client.join(`product-${productId}`);
    this.logger.log(`Client ${client.id} watching product ${productId}`);
  }

  @SubscribeMessage('unwatch-product')
  handleUnwatchProduct(client: Socket, productId: number) {
    client.leave(`product-${productId}`);
  }
}
