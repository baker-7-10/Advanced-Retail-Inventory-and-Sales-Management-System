import { Test, TestingModule } from '@nestjs/testing';
import { SalesController } from '../../../src/sales/sales.controller';
import { SalesService } from '../../../src/sales/sales.service';
import { CreateSaleDto } from '../../../src/sales/dto/create-sale.dto';
import { SalesQueryDto } from '../../../src/sales/dto/sales-query.dto';
import { UpdateSaleStatusDto } from '../../../src/sales/dto/update-sale-status.dto';
import { Sale, SaleStatus } from '../../../src/sales/entities/sale.entity';

describe('SalesController', () => {
  let controller: SalesController;
  let service: jest.Mocked<SalesService>;

  const mockSale = {
    id: 1,
    invoiceNumber: 'INV-2026-TEST',
    subtotal: 400,
    discountPercent: 10,
    discountAmount: 40,
    total: 360,
    notes: null,
    status: SaleStatus.COMPLETED,
    userId: 1,
    items: [],
    createdAt: new Date(),
  } as Sale;

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      updateStatus: jest.fn(),
      getInvoice: jest.fn(),
    } as unknown as jest.Mocked<SalesService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SalesController],
      providers: [
        { provide: SalesService, useValue: service },
      ],
    }).compile();

    controller = module.get<SalesController>(SalesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call service.create with dto and user id', async () => {
      const dto: CreateSaleDto = { items: [{ productId: 1, quantity: 2 }] };
      service.create.mockResolvedValue(mockSale);

      const result = await controller.create(dto, { id: 1 } as any);

      expect(service.create).toHaveBeenCalledWith(dto, 1);
      expect(result).toEqual(mockSale);
    });
  });

  describe('findAll', () => {
    it('should call service.findAll with query', async () => {
      const query: SalesQueryDto = { page: 1, limit: 20 };
      const expected = { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } };
      service.findAll.mockResolvedValue(expected);

      const result = await controller.findAll(query);

      expect(service.findAll).toHaveBeenCalledWith(query);
      expect(result).toEqual(expected);
    });
  });

  describe('findOne', () => {
    it('should call service.findOne with id', async () => {
      service.findOne.mockResolvedValue(mockSale);

      const result = await controller.findOne(1);

      expect(service.findOne).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockSale);
    });
  });

  describe('updateStatus', () => {
    it('should call service.updateStatus with id and status', async () => {
      const dto: UpdateSaleStatusDto = { status: SaleStatus.COMPLETED };
      const updated = { ...mockSale, status: SaleStatus.COMPLETED };
      service.updateStatus.mockResolvedValue(updated);

      const result = await controller.updateStatus(1, dto, { id: 1 } as any);

      expect(service.updateStatus).toHaveBeenCalledWith(1, SaleStatus.COMPLETED, 1);
      expect(result).toEqual(updated);
    });
  });

  describe('getInvoice', () => {
    it('should call service.getInvoice with id', async () => {
      const invoice = {
        invoiceNumber: 'INV-2026-TEST',
        date: new Date(),
        cashier: { name: 'John Doe', email: 'john@store.com' },
        items: [{ product: 'Product A', sku: 'A001', quantity: 2, unitPrice: 100, subtotal: 200 }],
        subtotal: 400,
        discountPercent: 10,
        discountAmount: 40,
        total: 360,
        notes: null,
      };
      service.getInvoice.mockResolvedValue(invoice);

      const result = await controller.getInvoice(1);

      expect(service.getInvoice).toHaveBeenCalledWith(1);
      expect(result).toEqual(invoice);
    });
  });

});
