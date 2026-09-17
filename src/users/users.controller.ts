import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Logger,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { RecoveryPasswordDto } from './dto/recovery-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PasswordRecoveryService } from './password-recovery.service';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(
    private readonly usersService: UsersService,
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

  @Get()
  async findAll(@Query() query) {
    const { limit } = query;
    try {
      const users = await this.usersService.findAll(limit);

      if (limit) {
        const limitedUsers = users.slice(0, limit);
        this.logger.debug(`Obtenidos ${limitedUsers.length} usuarios.`);
        return limitedUsers;
      }

      this.logger.debug(`Obtenidos ${users.length} usuarios.`);
      return users;
    } catch (error) {
      this.logger.error(`Error al obtener usuarios: ${error.message}`);
      throw error;
    }
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    if (!isNaN(+id)) {
      throw new HttpException('Invalid param', HttpStatus.BAD_REQUEST);
    }
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
