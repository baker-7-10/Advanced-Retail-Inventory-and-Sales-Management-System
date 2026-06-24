import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

// Response DTOs for extraModels
import { AuthResponseDto } from './auth/dto/auth-response.dto';
import { UserResponseDto as AuthUserResponseDto } from './auth/dto/user-response.dto';
import { UserResponseDto } from './users/dto/user-response.dto';
import { PaginatedUsersResponseDto } from './users/dto/paginated-users-response.dto';
import { CategoryResponseDto } from './categories/dto/category-response.dto';
import { PaginatedCategoryResponseDto } from './categories/dto/paginated-category-response.dto';
import { ProductResponseDto } from './products/dto/product-response.dto';
import { PaginatedProductsResponseDto } from './products/dto/paginated-products-response.dto';
import { SaleResponseDto, PaginatedSalesResponseDto } from './sales/dto/sale-response.dto';
import { InvoiceResponseDto } from './sales/dto/invoice-response.dto';
import { InventoryResponseDto } from './inventory/dto/inventory-response.dto';
import { InventoryStatsResponseDto } from './inventory/dto/inventory-stats-response.dto';
import { SalesSummaryResponseDto } from './common/dto/sales-summary-response.dto';
import { DailySalesResponseDto } from './common/dto/daily-sales-response.dto';
import { TopProductsResponseDto } from './common/dto/top-products-response.dto';
import { CategorySalesResponseDto } from './common/dto/category-sales-response.dto';
import { StockReportResponseDto } from './reports/dto/stock-report-response.dto';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  // Configure WebSocket gateway CORS from validated config
  class CorsIoAdapter extends IoAdapter {
    createIOServer(port: number, options?: ServerOptions): any {
      return super.createIOServer(port, {
        ...options,
        cors: {
          origin: configService.get<string>('FRONTEND_URL', 'http://localhost:4200'),
          credentials: true,
        },
      });
    }
  }
  app.useWebSocketAdapter(new CorsIoAdapter(app.getHttpServer()));

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Security headers
  app.use(helmet());

  // Enable CORS for AngularJS frontend
  app.enableCors({
    origin: configService.get<string>('FRONTEND_URL', 'http://localhost:4200'),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Swagger documentation
  if (configService.get('NODE_ENV') !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Retail Management API')
      .setDescription('Advanced Retail Inventory and Sales Management System')
      .setVersion('1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'JWT-auth',
      )
      .addTag('Authentication', 'Authentication endpoints')
      .addTag('Users', 'User management')
      .addTag('categories', 'Product categories')
      .addTag('Products', 'Product management')
      .addTag('sales', 'Sales transactions')
      .addTag('Inventory', 'Inventory management')
      .addTag('reports', 'Reports and analytics')
      .build();

    const document = SwaggerModule.createDocument(app, config, {
      extraModels: [
        AuthResponseDto,
        AuthUserResponseDto,
        UserResponseDto,
        PaginatedUsersResponseDto,
        CategoryResponseDto,
        PaginatedCategoryResponseDto,
        ProductResponseDto,
        PaginatedProductsResponseDto,
        SaleResponseDto,
        PaginatedSalesResponseDto,
        InvoiceResponseDto,
        InventoryResponseDto,
        InventoryStatsResponseDto,
        SalesSummaryResponseDto,
        DailySalesResponseDto,
        TopProductsResponseDto,
        CategorySalesResponseDto,
        StockReportResponseDto,
      ],
    });
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);

  console.log(`Application running on: http://localhost:${port}`);
  console.log(`Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();
