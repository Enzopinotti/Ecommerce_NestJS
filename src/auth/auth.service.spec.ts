import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { hashPassword } from '../utils/encryption.util';
import { AuthService } from './auth.service';

function userFixture(password: string) {
  return {
    _id: { toString: () => '507f1f77bcf86cd799439011' },
    email: 'auth@example.test',
    first_name: 'Auth',
    last_name: 'User',
    password,
  } as any;
}

describe('AuthService', () => {
  let service: AuthService;
  let usersService: {
    findByEmail: jest.Mock;
    create: jest.Mock;
  };
  let jwtService: {
    signAsync: jest.Mock;
  };

  beforeEach(() => {
    usersService = {
      findByEmail: jest.fn(),
      create: jest.fn(),
    };
    jwtService = {
      signAsync: jest.fn().mockResolvedValue('signed-session-token'),
    };

    service = new AuthService(
      usersService as unknown as UsersService,
      jwtService as unknown as JwtService,
    );
  });

  it('registers through the single password-hashing persistence path', async () => {
    usersService.findByEmail.mockResolvedValue(null);
    usersService.create.mockResolvedValue(userFixture('stored-hash'));

    const dto = {
      first_name: 'Auth',
      last_name: 'User',
      birthDate: new Date('1995-01-01'),
      email: 'auth@example.test',
      password: 'PlainPassword123',
      phone: '',
      avatar: '',
    };

    const result = await service.register(dto);

    expect(usersService.create).toHaveBeenCalledWith(dto);
    expect(usersService.create.mock.calls[0][0].password).toBe(
      'PlainPassword123',
    );
    expect(jwtService.signAsync).toHaveBeenCalledWith({
      email: 'auth@example.test',
      sub: '507f1f77bcf86cd799439011',
    });
    expect(result).toEqual({
      token: 'signed-session-token',
      user: {
        id: '507f1f77bcf86cd799439011',
        email: 'auth@example.test',
        first_name: 'Auth',
        last_name: 'User',
      },
    });
  });

  it('returns conflict for an existing registration email', async () => {
    usersService.findByEmail.mockResolvedValue(userFixture('stored-hash'));

    await expect(
      service.register({
        first_name: 'Auth',
        last_name: 'User',
        birthDate: new Date('1995-01-01'),
        email: 'auth@example.test',
        password: 'PlainPassword123',
        phone: '',
        avatar: '',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(usersService.create).not.toHaveBeenCalled();
  });

  it('returns unauthorized for a bad password', async () => {
    const storedHash = await hashPassword('CorrectPassword123');
    usersService.findByEmail.mockResolvedValue(userFixture(storedHash));

    await expect(
      service.login({
        email: 'auth@example.test',
        password: 'WrongPassword123',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('logs in with the persisted single bcrypt hash', async () => {
    const storedHash = await hashPassword('CorrectPassword123');
    usersService.findByEmail.mockResolvedValue(userFixture(storedHash));

    const result = await service.login({
      email: 'auth@example.test',
      password: 'CorrectPassword123',
    });

    expect(result.token).toBe('signed-session-token');
    expect(result.user.email).toBe('auth@example.test');
  });

  it('does not rewrite infrastructure failures as authentication failures', async () => {
    const databaseFailure = new Error('database unavailable');
    usersService.findByEmail.mockRejectedValue(databaseFailure);

    await expect(
      service.login({
        email: 'auth@example.test',
        password: 'CorrectPassword123',
      }),
    ).rejects.toBe(databaseFailure);
  });
});
