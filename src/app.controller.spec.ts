import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { CategoriesService } from './categories/categories.service';
import { ProductsService } from './products/products.service';
import { AppController } from './app.controller';
import { SESSION_COOKIE_NAME } from './auth/session-cookie';

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
      {} as ProductsService,
      {} as CategoriesService,
      { get: jest.fn().mockReturnValue('production') } as unknown as ConfigService,
    );
  });

  it('renders only the authenticated identity supplied by the JWT guard', () => {
    const user = {
      id: '507f1f77bcf86cd799439011',
      email: 'auth@example.test',
      first_name: 'Auth',
      last_name: 'User',
    };

    expect(controller.getProfileView({ user } as never)).toEqual({
      title: 'Profile',
      style: 'profile.css',
      user,
    });
  });

  it('renders the reset form without querying account state from the token URL', () => {
    expect(controller.getResetPassView('opaque-token')).toEqual({
      title: 'Reset Password',
      style: 'resetPass.css',
      tokenId: 'opaque-token',
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
