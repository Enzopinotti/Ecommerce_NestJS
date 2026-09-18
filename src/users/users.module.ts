import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MailService } from '../mail/mail.service';
import { PasswordRecoveryService } from './password-recovery.service';
import { User, UserSchema } from './schema/users.schema';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: User.name,
        schema: UserSchema,
      },
    ]),
  ],
  controllers: [UsersController],
  providers: [UsersService, MailService, PasswordRecoveryService],
  exports: [UsersService],
})
export class UsersModule {}
