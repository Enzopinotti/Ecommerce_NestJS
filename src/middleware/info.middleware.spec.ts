import { sanitizeRequestUrl } from './info.middleware';

describe('sanitizeRequestUrl', () => {
  it('redacts password-reset path tokens', () => {
    expect(sanitizeRequestUrl('/resetPassword/raw-secret-token')).toBe(
      '/resetPassword/[REDACTED]',
    );
  });

  it('redacts sensitive query parameters without removing safe ones', () => {
    const sanitized = sanitizeRequestUrl(
      '/callback?token=secret&access_token=another-secret&page=2',
    );

    expect(sanitized).toContain('token=%5BREDACTED%5D');
    expect(sanitized).toContain('access_token=%5BREDACTED%5D');
    expect(sanitized).toContain('page=2');
    expect(sanitized).not.toContain('secret');
  });

  it('keeps ordinary request URLs unchanged', () => {
    expect(sanitizeRequestUrl('/products?page=2&limit=10')).toBe(
      '/products?page=2&limit=10',
    );
  });

  it('does not expose malformed URL input', () => {
    expect(sanitizeRequestUrl('http://[invalid')).toBe('[unparseable-url]');
  });
});
