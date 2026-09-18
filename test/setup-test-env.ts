process.env.NODE_ENV = 'test';
process.env.PORT = '3000';
process.env.APP_BASE_URL = 'http://127.0.0.1:3000';
process.env.MONGODB_URI =
  process.env.TEST_MONGODB_URI ??
  'mongodb://127.0.0.1:27017/ecommerce_nestjs_test';
process.env.JWT_KEY =
  'b7-test-secret-with-at-least-thirty-two-characters';
process.env.MAIL_ENABLED = 'false';
process.env.SERVICE_MAIL = '';
process.env.SERVICE_MAIL_PORT = '587';
process.env.EMAIL_USER = '';
process.env.EMAIL_PASSWORD = '';
