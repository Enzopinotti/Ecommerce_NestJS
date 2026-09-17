import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as handlebars from 'express-handlebars';
import * as path from 'path';
import passport from 'passport';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import {
  categoryName,
  isAdmin,
  isNotPremium,
  isPremium,
} from './utils/handlebarsHelpers.util';

const logger = new Logger('Bootstrap');
const viewsPath = path.join(__dirname, 'views');
const publicPath = path.join(__dirname, 'public');

export async function createApplication(): Promise<NestExpressApplication> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const hbs = handlebars.create({
    layoutsDir: path.join(viewsPath, 'layouts'),
    runtimeOptions: {
      allowProtoPropertiesByDefault: false,
      allowProtoMethodsByDefault: false,
    },
    helpers: {
      isAdmin,
      isNotPremium,
      isPremium,
      categoryName,
    },
  });

  app.engine('handlebars', hbs.engine);
  app.set('views', viewsPath);
  app.set('view engine', 'handlebars');
  app.useStaticAssets(publicPath, { prefix: '' });
  app.use(cookieParser());
  app.use(passport.initialize());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      validationError: {
        target: false,
        value: false,
      },
    }),
  );
  app.enableShutdownHooks();

  return app;
}

export async function bootstrap(): Promise<void> {
  const app = await createApplication();
  const configService = app.get(ConfigService);
  const port = configService.getOrThrow<number>('PORT');

  await app.listen(port);
  logger.log(`Application listening on configured port ${port}`);
}

void bootstrap();
