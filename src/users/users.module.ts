import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schema/users.schema';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth/auth.service';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { JwtStrategy } from './auth/jwt.strategy';
import { MailService } from 'src/mail/mail.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name,
        schema: UserSchema
      }
    ]),
    JwtModule,
    ConfigModule.forRoot(),
  ],
  controllers: [UsersController],
  providers: [UsersService,
    AuthService,
    JwtAuthGuard,
    JwtStrategy,
    ConfigService,
    MailService
  ],
  exports: [UsersService],
})
export class UsersModule {}
