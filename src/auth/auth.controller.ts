import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginUserDto } from './dto/login-user.dto';

@Controller('auth')
export class AuthController {

    constructor(private authService: AuthService) {}
    @Post('login')
    signIn(@Body() loginUserDto: LoginUserDto) {
        return this.authService.login(loginUserDto);
    }

}
