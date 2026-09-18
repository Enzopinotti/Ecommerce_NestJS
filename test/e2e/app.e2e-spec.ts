import { getConnectionToken } from '@nestjs/mongoose';
import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { Connection, Types } from 'mongoose';
import { createApplication } from '../../src/main';

describe('Application e2e contracts', () => {
  let app: NestExpressApplication;
  let connection: Connection;

  beforeAll(async () => {
    app = await createApplication();
    await app.init();
    connection = app.get<Connection>(getConnectionToken());
  });

  beforeEach(async () => {
    await Promise.all([
      connection.collection('users').deleteMany({}),
      connection.collection('categories').deleteMany({}),
      connection.collection('products').deleteMany({}),
    ]);
  });

  afterAll(async () => {
    await app.close();
  });

  it('redirects the root route and serves the real login view/assets', async () => {
    await request(app.getHttpServer())
      .get('/')
      .expect(302)
      .expect('Location', '/login');

    await request(app.getHttpServer()).get('/login').expect(200);
    await request(app.getHttpServer()).get('/css/login.css').expect(200);
  });

  it('requires a session for profile', async () => {
    await request(app.getHttpServer()).get('/profile').expect(401);
  });

  it('supports register, cookie login, authenticated session and logout', async () => {
    const agent = request.agent(app.getHttpServer());
    const email = 'e2e-auth@example.test';
    const password = 'E2ePassword1';

    const register = await agent.post('/auth/register').send({
      first_name: 'E2E',
      last_name: 'User',
      birthDate: '1995-01-01T00:00:00.000Z',
      email,
      password,
      phone: '000000000',
      avatar: '',
    });

    expect(register.status).toBe(201);
    expect(register.body).not.toHaveProperty('token');
    expect(register.body.user).not.toHaveProperty('password');

    const login = await agent.post('/auth/login').send({ email, password });

    expect(login.status).toBe(200);
    expect(login.body).not.toHaveProperty('token');
    const setCookie = login.headers['set-cookie'] ?? [];
    expect(setCookie.join(';')).toContain('access_token=');
    expect(setCookie.join(';')).toContain('HttpOnly');
    expect(setCookie.join(';')).toContain('SameSite=Lax');

    await agent.get('/auth/session').expect(200);
    await agent.get('/profile').expect(200);
    await agent.post('/auth/logout').expect(200);
    await agent.get('/auth/session').expect(401);
  });

  it('keeps recovery response uniform for known and unknown email addresses', async () => {
    const email = 'e2e-recovery@example.test';

    await request(app.getHttpServer()).post('/auth/register').send({
      first_name: 'Recovery',
      last_name: 'User',
      birthDate: '1995-01-01T00:00:00.000Z',
      email,
      password: 'RecoveryPassword1',
      phone: '000000000',
      avatar: '',
    });

    const known = await request(app.getHttpServer())
      .post('/users/recoveryPass')
      .send({ email });
    const missing = await request(app.getHttpServer())
      .post('/users/recoveryPass')
      .send({ email: 'missing-e2e@example.test' });

    expect(known.status).toBe(202);
    expect(missing.status).toBe(202);
    expect(known.body).toEqual(missing.body);
  });

  it('serves only visible catalog resources and validates Mongo identifiers', async () => {
    const visibleCategoryId = new Types.ObjectId();
    const hiddenCategoryId = new Types.ObjectId();
    const visibleProductId = new Types.ObjectId();
    const hiddenProductId = new Types.ObjectId();

    await connection.collection('categories').insertMany([
      {
        _id: visibleCategoryId,
        nameCategory: 'E2E Visible Category',
        isVisible: true,
        createdAt: new Date(),
        description: 'Visible',
      },
      {
        _id: hiddenCategoryId,
        nameCategory: 'E2E Hidden Category',
        isVisible: false,
        createdAt: new Date(),
        description: 'Hidden',
      },
    ]);

    await connection.collection('products').insertMany([
      {
        _id: visibleProductId,
        name: 'E2E Visible Product',
        description: 'Visible',
        price: 10,
        code: 'E2E-VISIBLE',
        stock: 2,
        category: visibleCategoryId,
        thumbnails: [],
        status: true,
        isVisible: true,
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: hiddenProductId,
        name: 'E2E Hidden Product',
        description: 'Hidden',
        price: 20,
        code: 'E2E-HIDDEN',
        stock: 2,
        category: hiddenCategoryId,
        thumbnails: [],
        status: true,
        isVisible: false,
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const categories = await request(app.getHttpServer())
      .get('/categories')
      .expect(200);
    expect(categories.body).toHaveLength(1);
    expect(String(categories.body[0]._id)).toBe(String(visibleCategoryId));

    await request(app.getHttpServer())
      .get(`/products/${visibleProductId}`)
      .expect(200);
    await request(app.getHttpServer())
      .get(`/products/${hiddenProductId}`)
      .expect(404);
    await request(app.getHttpServer())
      .get('/products/not-an-object-id')
      .expect(400);

    const page = await request(app.getHttpServer())
      .get('/products?page=1&limit=10&sort=name&query=E2E')
      .expect(200);
    expect(page.text).toContain('E2E Visible Product');
    expect(page.text).not.toContain('E2E Hidden Product');
  });
});
