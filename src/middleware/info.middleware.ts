import { Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

const REDACTED_VALUE = '[REDACTED]';
const SENSITIVE_QUERY_KEYS = new Set([
  'token',
  'access_token',
  'resetToken',
  'reset_token',
]);

export function sanitizeRequestUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl, 'http://localhost');

    if (parsed.pathname.startsWith('/resetPassword/')) {
      parsed.pathname = '/resetPassword/[REDACTED]';
    }

    for (const key of SENSITIVE_QUERY_KEYS) {
      if (parsed.searchParams.has(key)) {
        parsed.searchParams.set(key, REDACTED_VALUE);
      }
    }

    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return '[unparseable-url]';
  }
}

export default class InfoMiddleware implements NestMiddleware {
  private readonly logger = new Logger(InfoMiddleware.name);

  use(req: Request, _res: Response, next: NextFunction) {
    const requestUrl = req.originalUrl || req.url;
    this.logger.log(`${req.method} ${sanitizeRequestUrl(requestUrl)}`);
    next();
  }
}
