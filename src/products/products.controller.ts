import { Controller, Get, Param } from '@nestjs/common';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get(':id')
  findOne(@Param('id', ParseObjectIdPipe) id: string) {
    return this.productsService.findOne(id);
  }
}
