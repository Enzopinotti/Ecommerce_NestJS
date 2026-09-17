import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SESSION_COOKIE_NAME, SESSION_TTL_MS } from './session-cookie';

const session = {
  token: 'private-jwt-token',
  user: {
    id: '507f1f77bcf86cd799439011',
    email: 'auth@example.test',
    first_name: 'Auth',
    last_name: 'User',
  },
};

describe('AuthController', () => {
  let controller: AuthController;
  let authService: {
    register: jest.Mock;
    login: jest.Mock;
  };
  let response: {
    cookie: jest.Mock;
    clearCookie: jest.Mock;
  };

  beforeEach(() => {
    authService = {
      register: jest.fn().mockResolvedValue(session),
      login: jest.fn().mockResolvedValue(session),
    };
    response = {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    };

    const configService = {
      get: jest.fn().mockReturnValue('production'),
    };

    controller = new AuthController(
      authService as unknown as AuthService,
      configService as unknown as ConfigService,
    );
  });

  it('sets the hardened cookie on registration without returning the JWT', async () => {
    const body = await controller.register(
      {
        first_name: 'Auth',
        last_name: 'User',
        birthDate: new Date('1995-01-01'),
        email: 'auth@example.test',
        password: 'Password123',
        phone: '',
        avatar: '',
      },
      response as unknown as Response,
    );

    expect(response.cookie).toHaveBeenCalledWith(
      SESSION_COOKIE_NAME,
      session.token,
      expect.objectContaining({
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        maxAge: SESSION_TTL_MS,
      }),
    );
    expect(body).not.toHaveProperty('token');
    expect(body).not.toHaveProperty('access_token');
    expect(body.user).toEqual(session.user);
  });

  it('sets the same cookie contract on login without returning the JWT', async () => {
    const body = await controller.login(
      { email: 'auth@example.test', password: 'Password123' },
      response as unknown as Response,
    );

    expect(response.cookie).toHaveBeenCalledWith(
      SESSION_COOKIE_NAME,
      session.token,
      expect.objectContaining({ httpOnly: true, secure: true, sameSite: 'lax' }),
    );
    expect(body).not.toHaveProperty('token');
    expect(body.user.email).toBe('auth@example.test');
  });

  it('returns only the identity attached by the JWT guard', () => {
    const request = { user: session.user } as unknown as Request & {
      user: typeof session.user;
    };

    expect(controller.session(request)).toEqual({
      status: 'success',
      user: session.user,
    });
  });

  it('clears the same cookie scope on logout', () => {
    const body = controller.logout(response as unknown as Response);

    expect(response.clearCookie).toHaveBeenCalledWith(
      SESSION_COOKIE_NAME,
      expect.objectContaining({
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
      }),
    );
    expect(body).toEqual({ message: 'Logout successful', status: 'success' });
  });
});
