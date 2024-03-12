import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import * as handlebars from 'express-handlebars';
import * as path from 'path';
import passport from 'passport';
import cookieParser from 'cookie-parser';
import { categoryName, isAdmin, isNotPremium, isPremium } from './utils/handlebarsHelpers.util';

const viewsPath = path.join(__dirname, '../src/views');
const publicPath = path.join(__dirname, '../src/public');

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  // Configurar Handlebars
  const hbs = handlebars.create({
    runtimeOptions: {
      allowProtoPropertiesByDefault: true,
      allowProtoMethodsByDefault: true,
    },
    helpers: {
      isAdmin: isAdmin,
      isNotPremium: isNotPremium,
      isPremium: isPremium,
      categoryName: categoryName,
    }
  });
  app.engine('handlebars', hbs.engine);
  app.set('views', viewsPath); // Usando viewsPath
  app.set('view engine', 'handlebars');
  app.useStaticAssets(publicPath, {
    prefix: '', // Prefijo para las rutas de archivos estáticos
  });
  app.use(cookieParser()); 
  app.use(passport.initialize());
  await app.listen(3000);
}

bootstrap();