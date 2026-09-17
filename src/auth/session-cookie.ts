import { CookieOptions, Request } from 'express';

export const SESSION_COOKIE_NAME = 'access_token';
export const SESSION_TTL_MS = 60 * 60 * 1000;

export function extractSessionToken(request: Request): string | null {
  const token = request.cookies?.[SESSION_COOKIE_NAME];
  return typeof token === 'string' && token.length > 0 ? token : null;
}

export function sessionCookieOptions(isProduction: boolean): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_MS,
  };
}

export function sessionClearCookieOptions(
  isProduction: boolean,
): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
  };
}
