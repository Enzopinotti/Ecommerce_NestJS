import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { UsersService } from '../users/users.service';
import { JwtPayload } from './jwt-payload.interface';
import { extractSessionToken } from './session-cookie';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: extractSessionToken,
      secretOrKey: configService.getOrThrow<string>('JWT_KEY'),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.usersService.findAuthIdentityById(payload.sub);

    if (!user || String(user.email) !== payload.email) {
      throw new UnauthorizedException();
    }

    return {
      id: user._id.toString(),
      email: String(user.email),
      first_name: String(user.first_name),
      last_name: String(user.last_name),
    };
  }
}
