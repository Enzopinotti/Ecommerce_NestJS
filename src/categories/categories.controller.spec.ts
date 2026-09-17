import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';

describe('CategoriesController public read surface', () => {
  let service: { findAll: jest.Mock; findOne: jest.Mock };
  let controller: CategoriesController;

  beforeEach(() => {
    service = { findAll: jest.fn(), findOne: jest.fn() };
    controller = new CategoriesController(service as unknown as CategoriesService);
  });

  it('delegates visible category listing', async () => {
    const categories = [{ _id: 'id', nameCategory: 'Shoes' }];
    service.findAll.mockResolvedValue(categories);

    await expect(controller.findAll()).resolves.toBe(categories);
  });

  it('delegates category lookup with a Mongo id string', async () => {
    const category = { _id: '507f1f77bcf86cd799439011' };
    service.findOne.mockResolvedValue(category);

    await expect(
      controller.findOne('507f1f77bcf86cd799439011'),
    ).resolves.toBe(category);
  });
});
