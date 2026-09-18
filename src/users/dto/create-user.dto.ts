import { Allow } from 'class-validator';

export class CreateUserDto {
  @Allow()
  first_name: string;

  @Allow()
  last_name: string;

  @Allow()
  birthDate: Date;

  @Allow()
  email: string;

  @Allow()
  password: string;

  @Allow()
  phone: string;

  @Allow()
  avatar: string;
}
