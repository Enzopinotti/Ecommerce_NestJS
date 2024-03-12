import { Injectable, NestMiddleware } from '@nestjs/common';
import passport from 'passport';

@Injectable()
export class PassportMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    passport.authenticate('jwt', { session: false }, (err, user, info) => {
      console.log(user)
      if (err || !user) {
        // Si hay un error o el usuario no está autenticado, continua al siguiente middleware
        return next();
      }
      // Si el usuario está autenticado, adjunta el usuario a la solicitud
      req.user = user;
      next();
    })(req, res, next);
  }
}