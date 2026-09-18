import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(32)
  readonly token: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(7)
  readonly password: string;
}
