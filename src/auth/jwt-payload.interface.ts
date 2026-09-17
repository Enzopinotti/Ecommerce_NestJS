export interface JwtPayload {
  email: string;
  sub: string;
  purpose: 'session';
}
