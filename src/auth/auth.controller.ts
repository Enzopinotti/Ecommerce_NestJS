import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { AuthService } from './auth.service';
import { AuthUserView } from './auth.types';
import { LoginUserDto } from './dto/login-user.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import {
  SESSION_COOKIE_NAME,
  sessionClearCookieOptions,
  sessionCookieOptions,
} from './session-cookie';

type AuthenticatedRequest = Request & { user: AuthUserView };

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    const user = await this.authService.register(createUserDto);
    return { message: 'Registration successful', status: 'success', user };
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

  @Get('session')
  @UseGuards(JwtAuthGuard)
  session(@Req() request: AuthenticatedRequest) {
    return { status: 'success', user: request.user };
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
