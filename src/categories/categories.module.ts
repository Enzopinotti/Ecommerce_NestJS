import { Module } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Category, CategorySchema } from './schema/categories.schema';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Category.name,
        schema: CategorySchema,
      }
    ]),
    ConfigModule
  ],
  controllers: [CategoriesController],
  providers: [
    CategoriesService,
    ConfigService,
  ],
  exports: [CategoriesService]
})
export class CategoriesModule {}
