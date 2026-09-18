import { NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';

describe('ProductsService public catalog', () => {
  let model: { paginate: jest.Mock; findOne: jest.Mock };
  let service: ProductsService;

  beforeEach(() => {
    model = {
      paginate: jest.fn(),
      findOne: jest.fn(),
    };
    service = new ProductsService(model as any);
  });

  it('paginates only visible products with a bounded, escaped search contract', async () => {
    model.paginate.mockResolvedValue({
      docs: [],
      totalPages: 0,
      hasNextPage: false,
      hasPrevPage: false,
      totalDocs: 0,
    });

    await service.findAllView({
      page: 2,
      limit: 25,
      sort: '-price',
      query: 'shoe.*',
    });

    expect(model.paginate).toHaveBeenCalledWith(
      {
        isVisible: true,
        name: { $regex: 'shoe\\.\\*', $options: 'i' },
      },
      expect.objectContaining({
        page: 2,
        limit: 25,
        sort: { price: -1 },
        lean: true,
      }),
    );
  });

  it('returns only a visible product by Mongo id', async () => {
    const exec = jest.fn().mockResolvedValue({ _id: 'id', name: 'Visible' });
    model.findOne.mockReturnValue({ exec });

    await service.findOne('507f1f77bcf86cd799439011');

    expect(model.findOne).toHaveBeenCalledWith({
      _id: '507f1f77bcf86cd799439011',
      isVisible: true,
    });
  });

  it('returns 404 when the visible-product lookup has no result', async () => {
    model.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

    await expect(
      service.findOne('507f1f77bcf86cd799439011'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
