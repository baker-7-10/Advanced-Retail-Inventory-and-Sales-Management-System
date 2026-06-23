import { Test, TestingModule } from '@nestjs/testing';
import { ReportsController } from '../../../src/reports/reports.controller';
import { ReportsService } from '../../../src/reports/reports.service';
import { ReportsQueryDto } from '../../../src/reports/dto/reports-query.dto';
import { SalesByDayQueryDto } from '../../../src/reports/dto/sales-by-day-query.dto';
import { StockReportQueryDto } from '../../../src/reports/dto/stock-report-query.dto';

describe('ReportsController', () => {
  let controller: ReportsController;
  let service: jest.Mocked<ReportsService>;

  beforeEach(async () => {
    service = {
      getSalesSummary: jest.fn(),
      getTopProducts: jest.fn(),
      getSalesByDay: jest.fn(),
      getSalesByCategory: jest.fn(),
      getStockReport: jest.fn(),
    } as unknown as jest.Mocked<ReportsService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportsController],
      providers: [
        { provide: ReportsService, useValue: service },
      ],
    }).compile();

    controller = module.get<ReportsController>(ReportsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getSalesSummary', () => {
    it('should call service.getSalesSummary with query dates', async () => {
      const query: ReportsQueryDto = { startDate: '2024-01-01', endDate: '2024-12-31' };
      const expected = { totalTransactions: 10 };
      service.getSalesSummary.mockResolvedValue(expected);

      const result = await controller.getSalesSummary(query);

      expect(service.getSalesSummary).toHaveBeenCalledWith('2024-01-01', '2024-12-31');
      expect(result).toEqual(expected);
    });

    it('should pass undefined when dates not provided', async () => {
      const query: ReportsQueryDto = {};
      service.getSalesSummary.mockResolvedValue({});

      await controller.getSalesSummary(query);

      expect(service.getSalesSummary).toHaveBeenCalledWith(undefined, undefined);
    });
  });

  describe('getTopProducts', () => {
    it('should call service.getTopProducts with limit and dates', async () => {
      const query: ReportsQueryDto = { limit: 5, startDate: '2024-01-01', endDate: '2024-12-31' };
      service.getTopProducts.mockResolvedValue([]);

      await controller.getTopProducts(query);

      expect(service.getTopProducts).toHaveBeenCalledWith(5, '2024-01-01', '2024-12-31', undefined);
    });

    it('should pass limit as undefined when not provided (ValidationPipe sets default)', async () => {
      const query: ReportsQueryDto = {};
      service.getTopProducts.mockResolvedValue([]);

      await controller.getTopProducts(query);

      expect(service.getTopProducts).toHaveBeenCalledWith(undefined, undefined, undefined, undefined);
    });
  });

  describe('getSalesByDay', () => {
    it('should call service.getSalesByDay with dates', async () => {
      const query: SalesByDayQueryDto = { startDate: '2024-01-01', endDate: '2024-01-31' };
      service.getSalesByDay.mockResolvedValue([]);

      const result = await controller.getSalesByDay(query);

      expect(service.getSalesByDay).toHaveBeenCalledWith('2024-01-01', '2024-01-31');
      expect(result).toEqual([]);
    });
  });

  describe('getSalesByCategory', () => {
    it('should call service.getSalesByCategory with dates', async () => {
      const query: ReportsQueryDto = { startDate: '2024-01-01', endDate: '2024-12-31' };
      service.getSalesByCategory.mockResolvedValue([]);

      await controller.getSalesByCategory(query);

      expect(service.getSalesByCategory).toHaveBeenCalledWith('2024-01-01', '2024-12-31', undefined, undefined);
    });
  });

  describe('getStockReport', () => {
    it('should call service.getStockReport with threshold', async () => {
      const query: StockReportQueryDto = { threshold: 20 };
      const expected = { summary: { totalProducts: 100, lowStock: 5, outOfStock: 2 }, products: [] };
      service.getStockReport.mockResolvedValue(expected);

      const result = await controller.getStockReport(query);

      expect(service.getStockReport).toHaveBeenCalledWith(20);
      expect(result).toEqual(expected);
    });

    it('should pass threshold as undefined when not provided (ValidationPipe sets default)', async () => {
      const query: StockReportQueryDto = {};
      service.getStockReport.mockResolvedValue({ summary: {} as any, products: [] });

      await controller.getStockReport(query);

      expect(service.getStockReport).toHaveBeenCalledWith(undefined);
    });
  });
});
