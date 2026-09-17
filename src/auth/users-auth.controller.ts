import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { AuthService } from './auth.service';
import { LoginUserDto } from './dto/login-user.dto';
import {
  SESSION_COOKIE_NAME,
  sessionClearCookieOptions,
  sessionCookieOptions,
} from './session-cookie';

@Controller('users')
export class UsersAuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('register')
  async register(
    @Body() createUserDto: CreateUserDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const session = await this.authService.register(createUserDto);
    response.cookie(
      SESSION_COOKIE_NAME,
      session.token,
      sessionCookieOptions(this.isProduction()),
    );

    return {
      message: 'Registration successful',
      status: 'success',
      user: session.user,
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginUserDto: LoginUserDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const session = await this.authService.login(loginUserDto);
    response.cookie(
      SESSION_COOKIE_NAME,
      session.token,
      sessionCookieOptions(this.isProduction()),
    );

    return {
      message: 'Login successful',
      status: 'success',
      user: session.user,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie(
      SESSION_COOKIE_NAME,
      sessionClearCookieOptions(this.isProduction()),
    );

    return { message: 'Logout successful', status: 'success' };
  }

  private isProduction(): boolean {
    return this.configService.get<string>('NODE_ENV') === 'production';
  }
}
