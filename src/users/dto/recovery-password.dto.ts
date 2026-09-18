import { IsEmail, IsNotEmpty } from 'class-validator';

export class RecoveryPasswordDto {
  @IsNotEmpty()
  @IsEmail()
  readonly email: string;
}
