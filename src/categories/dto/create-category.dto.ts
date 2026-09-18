import { Allow } from 'class-validator';

export class CreateCategoryDto {
  @Allow()
  nameCategory: string;

  @Allow()
  isVisible: boolean;

  @Allow()
  createdAt: Date;

  @Allow()
  description: string;
}
