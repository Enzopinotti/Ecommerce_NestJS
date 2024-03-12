import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport'; 
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtPayload } from './jwt-payload.interface';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private readonly authService: AuthService, 
        private readonly configService: ConfigService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: configService.get<string>('JWT_KEY'), // Utilizando ConfigService para obtener la clave secreta
        });
    }

    async validate(payload: JwtPayload) {
        const { email } = payload;
        const user = await this.authService.validateUser(email, null);
        if (!user) {
            throw new UnauthorizedException();
        }
        return user;
    }
}