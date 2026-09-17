import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { UserDocument } from '../users/schema/users.schema';
import { UsersService } from '../users/users.service';
import { comparePasswords } from '../utils/encryption.util';
import { LoginUserDto } from './dto/login-user.dto';
import { AuthSession, AuthUserView } from './auth.types';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(createUserDto: CreateUserDto): Promise<AuthUserView> {
    if (
      !createUserDto.first_name ||
      !createUserDto.last_name ||
      !createUserDto.email ||
      !createUserDto.password
    ) {
      throw new BadRequestException('Incomplete values');
    }

    const email = String(createUserDto.email);
    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    try {
      const user = await this.usersService.create(createUserDto);
      return this.toPublicUser(user);
    } catch (error: unknown) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictException('Email already exists');
      }
      throw error;
    }
  }

  async login(loginUserDto: LoginUserDto): Promise<AuthSession> {
    const user = await this.usersService.findByEmail(loginUserDto.email);
    const passwordMatches =
      user !== null &&
      user !== undefined &&
      (await comparePasswords(loginUserDto.password, user.password));

    if (!user || !passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.createSession(user);
  }

  private async createSession(user: UserDocument): Promise<AuthSession> {
    const publicUser = this.toPublicUser(user);
    const token = await this.jwtService.signAsync({
      email: publicUser.email,
      sub: publicUser.id,
      purpose: 'session',
    });

    return { token, user: publicUser };
  }

  private toPublicUser(user: UserDocument): AuthUserView {
    return {
      id: user._id.toString(),
      email: String(user.email),
      first_name: String(user.first_name),
      last_name: String(user.last_name),
    };
  }

  private isDuplicateKeyError(error: unknown): error is { code: number } {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: unknown }).code === 11000
    );
  }
}
