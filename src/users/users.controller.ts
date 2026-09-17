import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { MailService } from '../mail/mail.service';
import {
  comparePasswords,
  hashPassword,
  validatePassword,
} from '../utils/encryption.util';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly config: ConfigService,
  ) {}

  @Post('recoveryPass')
  async recoveryPassword(@Body('email') email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    const payload = { email: user.email, sub: user._id };
    const token = this.jwtService.sign(payload);

    user.resetPasswordToken = token;
    user.resetPasswordExpires = new Date(Date.now() + 3600000);
    await user.save();

    const appBaseUrl = this.config.getOrThrow<string>('APP_BASE_URL');
    await this.mailService.sendMail(
      email,
      'Recuperación de contraseña',
      `Estimado/a ${user.first_name},\n\nHas solicitado recuperar tu contraseña. Por favor utiliza el siguiente enlace para restablecer tu contraseña: ${appBaseUrl}/resetPassword/${token}`,
    );

    return { message: 'Recovery email sent successfully', status: 'success' };
  }

  @Post('resetPass')
  async resetPassword(
    @Body('token') token: string,
    @Body('password') password: string,
  ) {
    const user = await this.usersService.findByToken(token);
    if (!user) {
      throw new HttpException('Invalid token', HttpStatus.BAD_REQUEST);
    }
    this.logger.debug(`Usuario encontrado: ${user.email}`);
    if (user.resetPasswordExpires < new Date()) {
      throw new HttpException('Token expired', HttpStatus.BAD_REQUEST);
    }
    if (await comparePasswords(password, user.password)) {
      throw new HttpException(
        'La contraseña no puede ser igual a la anterior.',
        HttpStatus.BAD_REQUEST,
      );
    }
    if ((await validatePassword(password)) === false) {
      throw new HttpException(
        'Formato de contraseña invalido.',
        HttpStatus.BAD_REQUEST,
      );
    }
    user.password = await hashPassword(password);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();
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
