import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const PRODUCT_SORT_VALUES = [
  'name',
  '-name',
  'price',
  '-price',
  'createdAt',
  '-createdAt',
] as const;

export class ProductQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 10;

  @IsOptional()
  @IsIn(PRODUCT_SORT_VALUES)
  sort: (typeof PRODUCT_SORT_VALUES)[number] = 'name';

  @IsOptional()
  @IsString()
  @MaxLength(80)
  query = '';
}
