import {
  Controller,
  Get,
  Logger,
  Param,
  Post,
  Query,
  Redirect,
  Render,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { AuthUserView } from './auth/auth.types';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import {
  SESSION_COOKIE_NAME,
  sessionClearCookieOptions,
} from './auth/session-cookie';
import { CategoriesService } from './categories/categories.service';
import { ProductsService } from './products/products.service';
import { UsersService } from './users/users.service';

type AuthenticatedRequest = Request & { user: AuthUserView };

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(
    private readonly userService: UsersService,
    private readonly productService: ProductsService,
    private readonly categoryService: CategoriesService,
    private readonly config: ConfigService,
  ) {}

  @Get()
  @Redirect('/login')
  redirectToLogin() {
    return {};
  }

  @Get('login')
  @Render('login')
  getLoginView() {
    return { title: 'Login', style: 'login.css' };
  }

  @Get('register')
  @Render('register')
  getRegisterView() {
    return { title: 'Register', style: 'register.css' };
  }

  @Post('logout')
  logoutUser(@Res() response: Response) {
    response.clearCookie(
      SESSION_COOKIE_NAME,
      sessionClearCookieOptions(this.isProduction()),
    );
    response.redirect('/login');
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @Render('profile')
  getProfileView(@Req() request: AuthenticatedRequest) {
    return {
      title: 'Profile',
      style: 'profile.css',
      user: request.user,
    };
  }

  @Get('recoveryPass')
  @Render('recoveryPass')
  getRecoveryPassView() {
    return { title: 'Recovery Password', style: 'recoveryPass.css' };
  }

  @Get('resetPassword/:tokenId')
  @Render('resetPass')
  async getResetPassView(@Param('tokenId') id: string) {
    const user = await this.userService.findByToken(id);
    if (!user) {
      this.logger.debug(
        'No se encontró ningún usuario con el token proporcionado.',
      );
    }
    return {
      title: 'Reset Password',
      style: 'resetPass.css',
      tokenId: id,
    };
  }

  @Get('products')
  @Render('products')
  async getProductsView(
    @Query()
    options: { page: number; limit: number; sort: string; query: string },
  ): Promise<Record<string, unknown>> {
    options.page = options.page || 1;
    options.limit = options.limit || 10;
    options.sort = options.sort || 'name';
    options.query = options.query || '';

    const categories = await this.categoryService.findAll();
    const categoryMap: Record<string, string> = {};
    categories.forEach((category) => {
      categoryMap[category._id.toString()] = category.nameCategory;
    });

    const {
      products,
      totalPages,
      hasNextPage,
      hasPrevPage,
      totalDocs,
    } = await this.productService.findAllView(options);

    return {
      products,
      totalPages,
      currentPage: options.page,
      hasNextPage,
      hasPrevPage,
      prevLink: hasPrevPage
        ? `/products?page=${options.page - 1}&limit=${options.limit}`
        : null,
      nextLink: hasNextPage
        ? `/products?page=${options.page + 1}&limit=${options.limit}`
        : null,
      totalDocs,
      categoryMap,
      style: 'products.css',
      title: 'Productos',
      user: null,
    };
  }

  private isProduction(): boolean {
    return this.config.get<string>('NODE_ENV') === 'production';
  }
}
