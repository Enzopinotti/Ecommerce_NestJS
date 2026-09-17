import { Allow } from 'class-validator';

export class CreateProductDto {
  @Allow()
  name: String;

  @Allow()
  description: String;

  @Allow()
  price: Number;

  @Allow()
  code: String;

  @Allow()
  stock: Number;

  @Allow()
  category: String;

  @Allow()
  thumbnails: Array<String>;

  @Allow()
  status: Boolean;

  @Allow()
  isVisible: Boolean;

  @Allow()
  tags: Array<String>;

  @Allow()
  createdAt: Date;

  @Allow()
  updatedAt: Date;
}
