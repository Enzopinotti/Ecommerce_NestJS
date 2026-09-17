import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { RecoveryPasswordDto } from './dto/recovery-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { PasswordRecoveryService } from './password-recovery.service';

@Controller('users')
export class UsersController {
  constructor(
    private readonly passwordRecoveryService: PasswordRecoveryService,
  ) {}

  @Post('recoveryPass')
  @HttpCode(HttpStatus.ACCEPTED)
  async recoveryPassword(@Body() body: RecoveryPasswordDto) {
    await this.passwordRecoveryService.requestReset(body.email);
    return {
      status: 'accepted',
      message:
        'If the account exists, password recovery instructions will be sent.',
    };
  }

  @Post('resetPass')
  async resetPassword(@Body() body: ResetPasswordDto) {
    await this.passwordRecoveryService.resetPassword(body.token, body.password);
    return { message: 'Password updated successfully', status: 'success' };
  }
}
