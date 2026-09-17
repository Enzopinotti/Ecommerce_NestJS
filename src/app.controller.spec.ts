import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { AppController } from './app.controller';
import { AuthUserView } from './auth/auth.types';
import { SESSION_COOKIE_NAME } from './auth/session-cookie';
import { CategoriesService } from './categories/categories.service';
import { ProductsService } from './products/products.service';
import { UsersService } from './users/users.service';

type AuthenticatedRequest = Request & { user: AuthUserView };

describe('AppController auth-facing views', () => {
  let controller: AppController;
  let response: {
    clearCookie: jest.Mock;
    redirect: jest.Mock;
  };

  beforeEach(() => {
    response = {
      clearCookie: jest.fn(),
      redirect: jest.fn(),
    };

    controller = new AppController(
      { findByToken: jest.fn() } as unknown as UsersService,
      {} as unknown as ProductsService,
      {} as unknown as CategoriesService,
      { get: jest.fn().mockReturnValue('production') } as unknown as ConfigService,
    );
  });

  it('renders only the authenticated identity supplied by the JWT guard', () => {
    const user: AuthUserView = {
      id: '507f1f77bcf86cd799439011',
      email: 'auth@example.test',
      first_name: 'Auth',
      last_name: 'User',
    };
    const request = { user } as unknown as AuthenticatedRequest;

    expect(controller.getProfileView(request)).toEqual({
      title: 'Profile',
      style: 'profile.css',
      user,
    });
  });

  it('clears the hardened session cookie and redirects on browser logout', () => {
    controller.logoutUser(response as unknown as Response);

    expect(response.clearCookie).toHaveBeenCalledWith(
      SESSION_COOKIE_NAME,
      expect.objectContaining({
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
      }),
    );
    expect(response.redirect).toHaveBeenCalledWith('/login');
  });
});
