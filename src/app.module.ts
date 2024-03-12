// app.module.ts
import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { CartsModule } from './carts/carts.module';
import InfoMiddleware from './middleware/info.middleware';
import { LoggerMiddleware } from './middleware/logger.middleware';
import { HandlebarsConfigService } from './config/handlebars.config';
import { MailService } from './mail/mail.service';
import { CategoriesModule } from './categories/categories.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './users/auth/jwt.strategy';
import { PassportMiddleware } from './middleware/passport.middleware';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_KEY'),
        signOptions: { expiresIn: '1h' }, // Configura la expiración como desees
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get('MONGODB_URI'),
      }),
    }),
    UsersModule, 
    ProductsModule, 
    CartsModule, 
    CategoriesModule, AuthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    HandlebarsConfigService,
    MailService,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(InfoMiddleware).forRoutes({ path:'*', method: RequestMethod.ALL });
    consumer.apply(LoggerMiddleware).forRoutes('*');
    consumer.apply(PassportMiddleware)
    .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
