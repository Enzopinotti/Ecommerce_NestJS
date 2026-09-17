import { Controller, Get, Param } from '@nestjs/common';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import { CategoriesService } from './categories.service';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  findAll() {
    return this.categoriesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseObjectIdPipe) id: string) {
    return this.categoriesService.findOne(id);
  }
}
