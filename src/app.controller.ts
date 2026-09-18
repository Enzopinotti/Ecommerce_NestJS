import {
  Controller,
  Get,
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
import { ProductQueryDto } from './products/dto/product-query.dto';
import { ProductsService } from './products/products.service';

type AuthenticatedRequest = Request & { user: AuthUserView };

@Controller()
export class AppController {
  constructor(
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
  getResetPassView(@Param('tokenId') tokenId: string) {
    return {
      title: 'Reset Password',
      style: 'resetPass.css',
      tokenId,
    };
  }

  @Get('products')
  @Render('products')
  async getProductsView(
    @Query() options: ProductQueryDto,
  ): Promise<Record<string, unknown>> {
    const categories = await this.categoryService.findAll();
    const categoryMap: Record<string, string> = {};
    categories.forEach((category) => {
      categoryMap[category._id.toString()] = String(category.nameCategory);
    });

    const { products, totalPages, hasNextPage, hasPrevPage, totalDocs } =
      await this.productService.findAllView(options);

    return {
      products,
      totalPages,
      currentPage: options.page,
      hasNextPage,
      hasPrevPage,
      prevLink: hasPrevPage
        ? this.buildProductsPageLink(options.page - 1, options)
        : null,
      nextLink: hasNextPage
        ? this.buildProductsPageLink(options.page + 1, options)
        : null,
      totalDocs,
      categoryMap,
      style: 'products.css',
      title: 'Productos',
    };
  }

  private buildProductsPageLink(
    page: number,
    options: ProductQueryDto,
  ): string {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(options.limit),
      sort: options.sort,
    });
    if (options.query) {
      params.set('query', options.query);
    }
    return `/products?${params.toString()}`;
  }

  private isProduction(): boolean {
    return this.config.get<string>('NODE_ENV') === 'production';
  }
}
