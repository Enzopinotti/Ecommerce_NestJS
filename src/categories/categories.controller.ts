import { Controller, Get, Post, Body, Patch, Param, Delete, Logger } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Controller('categories')
export class CategoriesController {
  private readonly logger = new Logger(CategoriesController.name);

  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  create(@Body() createCategoryDto: CreateCategoryDto) {
    this.logger.debug(`Creating category: ${createCategoryDto.nameCategory}`);
    return this.categoriesService.create(createCategoryDto);
  }

  @Get()
  findAll() {
    this.logger.debug(`Finding all categories`);
    return this.categoriesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body()
   updateCategoryDto: UpdateCategoryDto) {
    this.logger.debug(`Updating category with id: ${id}`);
    return this.categoriesService.update(id, updateCategoryDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    this.logger.debug(`Removing category with id: ${id}`);
    return this.categoriesService.remove(id);
  }
}
