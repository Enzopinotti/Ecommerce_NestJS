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
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthService } from './auth/auth.service';
import { LoginUserDto } from './dto/login-user.dto';
import { MailService } from 'src/mail/mail.service';
import {
  comparePasswords,
  hashPassword,
  validatePassword,
} from 'src/utils/encryption.util';

@Controller('users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly config: ConfigService,
  ) {}

  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    this.logger.log(`Registrando usuario ${createUserDto.email}`);
    if (
      !createUserDto.first_name ||
      !createUserDto.last_name ||
      !createUserDto.email ||
      !createUserDto.password
    ) {
      throw new HttpException('Incomplete Values', HttpStatus.BAD_REQUEST);
    }
    return this.authService.register(createUserDto);
  }

  @Post('login')
  async login(@Body() loginUserDto: LoginUserDto, @Res() res: Response) {
    try {
      this.logger.debug('Ingresó a login');
      const tokenPayload = await this.authService.login(loginUserDto);
      this.logger.log(`Iniciando sesión de ${loginUserDto.email}`);

      res.cookie('access_token', tokenPayload.access_token, {
        httpOnly: true,
        maxAge: 60 * 60 * 1000,
      });
      res.status(HttpStatus.OK).json({
        message: 'Login successful',
        tokenPayload,
        status: 'success',
      });
    } catch (error) {
      this.logger.error(`Error al iniciar sesión: ${error.message}`);
      throw new HttpException(
        'Error al iniciar sesión',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('recoveryPass')
  async recoveryPassword(@Body('email') email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      console.log('entré acá');
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
    console.log('usuario: ', user);
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
