import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Product, ProductSchema } from './schema/products.schema';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CategoriesService } from 'src/categories/categories.service';
import { CategoriesModule } from 'src/categories/categories.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Product.name,
        schema: ProductSchema
      }
    ]),
    ConfigModule,
  ],
  controllers: [ProductsController],
  providers: [
    ProductsService,
    ConfigService,
  
  ],
  exports: [ProductsService]
})
export class ProductsModule {}
