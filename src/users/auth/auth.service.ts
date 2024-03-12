// auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { LoginUserDto } from '../dto/login-user.dto';
import { hashPassword, comparePasswords } from 'src/utils/encryption.util';
@Injectable()
export class AuthService {
    constructor(
        private readonly userService: UsersService,
        private readonly jwtService: JwtService,
    ) {}
    
    async register(createUserDto: CreateUserDto): Promise<any> {
        try {
            // Verifica si el usuario ya existe en la base de datos
            const { email, password, ...rest } = createUserDto;
            const existingUser = await this.userService.findByEmail(email);
            if (existingUser) {
                throw new UnauthorizedException('Email already exists');
            }
            // Encripta la contraseña antes de almacenarla
            const hashedPassword = await hashPassword(password);
            // Crea un nuevo usuario en la base de datos
            const newUser = await this.userService.create({ email, password: hashedPassword, ...rest });
            // Genera el token de acceso para el nuevo usuario
            const payload = { email: newUser.email, sub: newUser._id };
            return {
                access_token: this.jwtService.sign(payload),
                status: 'success',
            };
        } catch (error) {
            // Maneja cualquier error que ocurra durante el registro
            throw new UnauthorizedException('Error registering user');
        }
    }

    async login(loginUserDto: LoginUserDto): Promise<any> {
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
                access_token: this.jwtService.signAsync(payload),
            };
        } catch (error) {
            throw new UnauthorizedException('Invalid credentials');
        }
    }
    async validateUser(email: string, password: string): Promise<any> {
        const user = await this.userService.findByEmail(email);
        if (user && user.password === password) {
            return user;
        }
        return null;
    }


}