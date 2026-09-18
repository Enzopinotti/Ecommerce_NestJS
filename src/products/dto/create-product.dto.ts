import { Allow } from 'class-validator';

export class CreateProductDto {
  @Allow()
  name: string;

  @Allow()
  description: string;

  @Allow()
  price: number;

  @Allow()
  code: string;

  @Allow()
  stock: number;

  @Allow()
  category: string;

  @Allow()
  thumbnails: Array<string>;

  @Allow()
  status: boolean;

  @Allow()
  isVisible: boolean;

  @Allow()
  tags: Array<string>;

  @Allow()
  createdAt: Date;

  @Allow()
  updatedAt: Date;
}
