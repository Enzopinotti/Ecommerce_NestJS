import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ValidationPipe, HttpStatus, HttpException, Logger } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './schema/products.schema';

@Controller('products')
export class ProductsController {
  private readonly logger = new Logger;
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  create(@Body(ValidationPipe) createProductDto: CreateProductDto) {
    this.logger.debug(`Creando producto ${createProductDto.name}`);
    if(!createProductDto.name || !createProductDto.price || !createProductDto.stock || !createProductDto.category){
      this.logger.error('Incomplete Values');
      throw new HttpException('Incomplete Values', HttpStatus.BAD_REQUEST)
    }

    return this.productsService.create(createProductDto);
  }
  /*
  @Get('all')
  async findAll(@Query() options: { page: number; limit: number; sort: string; query: string }): Promise<{ products: Product[]; totalPages: number; hasNextPage: boolean; hasPrevPage: boolean; totalDocs: number }> {
    return this.productsService.findAllView(options);
  }*/

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productsService.update(+id, updateProductDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productsService.remove(+id);
  }
}
