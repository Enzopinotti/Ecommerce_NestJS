import { NotFoundException } from '@nestjs/common';
import { CategoriesService } from './categories.service';

describe('CategoriesService public catalog', () => {
  let model: { find: jest.Mock; findOne: jest.Mock };
  let service: CategoriesService;

  beforeEach(() => {
    model = { find: jest.fn(), findOne: jest.fn() };
    service = new CategoriesService(model as any);
  });

  it('lists visible categories only', async () => {
    const exec = jest.fn().mockResolvedValue([]);
    const lean = jest.fn().mockReturnValue({ exec });
    model.find.mockReturnValue({ lean });

    await service.findAll();

    expect(model.find).toHaveBeenCalledWith({ isVisible: true });
  });

  it('looks up a visible category by Mongo id', async () => {
    const exec = jest.fn().mockResolvedValue({ _id: 'id' });
    const lean = jest.fn().mockReturnValue({ exec });
    model.findOne.mockReturnValue({ lean });

    await service.findOne('507f1f77bcf86cd799439011');

    expect(model.findOne).toHaveBeenCalledWith({
      _id: '507f1f77bcf86cd799439011',
      isVisible: true,
    });
  });

  it('returns 404 for a hidden or missing category', async () => {
    const exec = jest.fn().mockResolvedValue(null);
    const lean = jest.fn().mockReturnValue({ exec });
    model.findOne.mockReturnValue({ lean });

    await expect(
      service.findOne('507f1f77bcf86cd799439011'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
