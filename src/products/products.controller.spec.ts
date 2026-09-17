import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

describe('ProductsController public read surface', () => {
  let service: { findOne: jest.Mock };
  let controller: ProductsController;

  beforeEach(() => {
    service = { findOne: jest.fn() };
    controller = new ProductsController(service as unknown as ProductsService);
  });

  it('delegates visible-product lookup using the Mongo id string', async () => {
    const product = { _id: '507f1f77bcf86cd799439011', name: 'Visible' };
    service.findOne.mockResolvedValue(product);

    await expect(
      controller.findOne('507f1f77bcf86cd799439011'),
    ).resolves.toBe(product);
    expect(service.findOne).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
  });
});
