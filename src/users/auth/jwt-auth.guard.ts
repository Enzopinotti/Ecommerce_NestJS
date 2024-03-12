// jwt-auth.guard.ts
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

//Para usarlo en un controller poner antes despues del get y antes de la función @UseGuards(JwtAuthGuard)