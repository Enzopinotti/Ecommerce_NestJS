import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Category, CategoryDocument } from './schema/categories.schema';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
  ) {}

  findAll() {
    return this.categoryModel.find({ isVisible: true }).lean().exec();
  }

  async findOne(id: string) {
    const category = await this.categoryModel
      .findOne({ _id: id, isVisible: true })
      .lean()
      .exec();

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  findByIds(categoryIds: string[]) {
    return this.categoryModel
      .find({ _id: { $in: categoryIds }, isVisible: true })
      .lean()
      .exec();
  }
}
