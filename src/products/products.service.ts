import { Injectable } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Product, ProductDocument } from './schema/products.schema';
import { Model, PaginateModel, PaginateOptions, PaginateResult } from 'mongoose';



@Injectable()
export class ProductsService {
  
  constructor(
    @InjectModel(Product.name) private readonly productModel: PaginateModel<ProductDocument>,
  ) {}

  create(createProductDto: CreateProductDto) {
    return this.productModel.create(createProductDto);
  }

  async findAllView(
    options: { page: number; limit: number; sort: string; query: string },
  ): Promise<{
    products: Product[];
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    totalDocs: number;
  }> {
    try {
      const { page, limit, sort, query } = options;
      const queryOptions = { isVisible: true };
      const paginateOptions: PaginateOptions = { page, limit, sort };

      // Realizar la consulta paginada de los productos
      const paginatedProducts: PaginateResult<ProductDocument> = await this.productModel.paginate(
        queryOptions,
        paginateOptions,
      );

      return {
        products: paginatedProducts.docs,
        totalPages: paginatedProducts.totalPages,
        hasNextPage: paginatedProducts.hasNextPage,
        hasPrevPage: paginatedProducts.hasPrevPage,
        totalDocs: paginatedProducts.totalDocs,
      };
    } catch (error) {
      console.error("Error en ProductService.findAll:", error);
      throw error;
    }
  }

  findOne(id: number) {
    return `This action returns a #${id} product`;
  }

  update(id: number, updateProductDto: UpdateProductDto) {
    return `This action updates a #${id} product`;
  }

  remove(id: number) {
    return `This action removes a #${id} product`;
  }
}
