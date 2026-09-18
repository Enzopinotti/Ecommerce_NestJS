const testMongoUri = process.env.TEST_MONGODB_URI;

if (!testMongoUri) {
  throw new Error('TEST_MONGODB_URI is required for Mongo-backed tests');
}

process.env.NODE_ENV = 'test';
process.env.PORT = '3100';
process.env.APP_BASE_URL = 'http://e2e.example.test';
process.env.MONGODB_URI = testMongoUri;
process.env.JWT_KEY = 'b7-test-secret-with-at-least-32-characters';
process.env.MAIL_ENABLED = 'false';
process.env.SERVICE_MAIL = '';
process.env.SERVICE_MAIL_PORT = '587';
process.env.EMAIL_USER = '';
process.env.EMAIL_PASSWORD = '';
