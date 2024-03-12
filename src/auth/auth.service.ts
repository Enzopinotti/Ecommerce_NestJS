import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';
import { LoginUserDto } from './dto/login-user.dto';
import { comparePasswords } from 'src/utils/encryption.util';

@Injectable()
export class AuthService {

    constructor(
        private readonly userService: UsersService,
        private readonly jwtService: JwtService,
    ) {}
    
    async login(loginUserDto: LoginUserDto): Promise<{ access_token: string }> {
        try {
            // Encuentra el usuario por su email
            const user = await this.userService.findByEmail(loginUserDto.email);
            
            // Si el usuario no existe o la contraseña no coincide, lanza una excepción de no autorizado
            if (!user || !(await comparePasswords(loginUserDto.password, user.password))) {
                throw new UnauthorizedException('Invalid credentials');
            }
            // Genera el token de acceso para el usuario autenticado
            const payload = { email: user.email, sub: user._id };
            return {
                access_token: await this.jwtService.signAsync(payload),
            };
        } catch (error) {
            throw new UnauthorizedException('Invalid credentials');
        }
    }



}
