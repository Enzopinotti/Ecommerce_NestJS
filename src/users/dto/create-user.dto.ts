import { Allow } from 'class-validator';

export class CreateUserDto {
  @Allow()
  first_name: String;

  @Allow()
  last_name: String;

  @Allow()
  birthDate: Date;

  @Allow()
  email: String;

  @Allow()
  password: String;

  @Allow()
  phone: String;

  @Allow()
  avatar: String;
}
