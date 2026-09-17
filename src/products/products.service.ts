import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  FilterQuery,
  PaginateModel,
  PaginateOptions,
  PaginateResult,
} from 'mongoose';
import { ProductQueryDto } from './dto/product-query.dto';
import { Product, ProductDocument } from './schema/products.schema';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: PaginateModel<ProductDocument>,
  ) {}

  async findAllView(options: ProductQueryDto): Promise<{
    products: ProductDocument[];
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    totalDocs: number;
  }> {
    const filter: FilterQuery<ProductDocument> = { isVisible: true };
    const search = options.query.trim();

    if (search) {
      filter.name = {
        $regex: this.escapeRegularExpression(search),
        $options: 'i',
      };
    }

    const descending = options.sort.startsWith('-');
    const sortField = descending ? options.sort.slice(1) : options.sort;
    const paginateOptions: PaginateOptions = {
      page: options.page,
      limit: options.limit,
      sort: { [sortField]: descending ? -1 : 1 },
      lean: true,
    };

    const paginatedProducts: PaginateResult<ProductDocument> =
      await this.productModel.paginate(filter, paginateOptions);

    return {
      products: paginatedProducts.docs,
      totalPages: paginatedProducts.totalPages,
      hasNextPage: paginatedProducts.hasNextPage,
      hasPrevPage: paginatedProducts.hasPrevPage,
      totalDocs: paginatedProducts.totalDocs,
    };
  }

  async findOne(id: string): Promise<ProductDocument> {
    const product = await this.productModel
      .findOne({ _id: id, isVisible: true })
      .exec();

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  private escapeRegularExpression(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
