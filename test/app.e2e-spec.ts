import { INestApplication } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';
import request from 'supertest';
import { createApplication } from '../src/main';

describe('Current product HTTP contracts (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;

  beforeAll(async () => {
    app = await createApplication();
    await app.init();
    connection = app.get<Connection>(getConnectionToken());
  });

  beforeEach(async () => {
    await Promise.all([
      connection.collection('users').deleteMany({}),
      connection.collection('products').deleteMany({}),
      connection.collection('categories').deleteMany({}),
    ]);
  });

  afterAll(async () => {
    await app.close();
  });

  it('redirects the historical root and renders maintained login assets', async () => {
    await request(app.getHttpServer())
      .get('/')
      .expect(302)
      .expect('Location', '/login');

    const login = await request(app.getHttpServer()).get('/login').expect(200);
    expect(login.text).toMatch(/Login/i);

    const css = await request(app.getHttpServer())
      .get('/css/login.css')
      .expect(200);
    expect(css.text.length).toBeGreaterThan(100);
  });

  it('runs the browser-session lifecycle through canonical auth endpoints', async () => {
    const email = 'e2e-auth@example.test';
    const password = 'E2ePassword123';

    await request(app.getHttpServer()).get('/auth/session').expect(401);
    await request(app.getHttpServer()).get('/profile').expect(401);

    const registration = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        first_name: 'E2E',
        last_name: 'User',
        birthDate: '1995-01-01T00:00:00.000Z',
        email,
        password,
        phone: '000000002',
        avatar: '',
      })
      .expect(201);

    expect(registration.headers['set-cookie']).toBeUndefined();
    expect(registration.body.user.email).toBe(email);
    expect(JSON.stringify(registration.body)).not.toMatch(/password/i);
    expect(JSON.stringify(registration.body)).not.toMatch(/access_token/i);

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);

    const cookies = login.headers['set-cookie'];
    expect(cookies).toBeDefined();
    const cookie = Array.isArray(cookies) ? cookies[0] : String(cookies);
    expect(cookie).toMatch(/^access_token=/i);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);

    const cookiePair = cookie.split(';', 1)[0];
    const token = cookiePair.slice(cookiePair.indexOf('=') + 1);
    expect(JSON.stringify(login.body)).not.toContain(token);

    const session = await request(app.getHttpServer())
      .get('/auth/session')
      .set('Cookie', cookiePair)
      .expect(200);
    expect(session.body.user.email).toBe(email);

    const profile = await request(app.getHttpServer())
      .get('/profile')
      .set('Cookie', cookiePair)
      .expect(200);
    expect(profile.text).toContain(email);

    await request(app.getHttpServer())
      .get('/auth/session')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);

    const logout = await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Cookie', cookiePair)
      .expect(200);

    const clearedCookies = logout.headers['set-cookie'];
    const cleared = Array.isArray(clearedCookies)
      ? clearedCookies[0]
      : String(clearedCookies);
    expect(cleared).toMatch(/^access_token=;/i);
  });

  it('serves only visible catalog resources over JSON and rendered HTML', async () => {
    const visibleCategoryId = new Types.ObjectId();
    const hiddenCategoryId = new Types.ObjectId();
    const visibleProductId = new Types.ObjectId();
    const hiddenProductId = new Types.ObjectId();

    await connection.collection('categories').insertMany([
      {
        _id: visibleCategoryId,
        nameCategory: 'Visible E2E category',
        isVisible: true,
        description: 'Visible',
        createdAt: new Date(),
      },
      {
        _id: hiddenCategoryId,
        nameCategory: 'Hidden E2E category',
        isVisible: false,
        description: 'Hidden',
        createdAt: new Date(),
      },
    ]);

    await connection.collection('products').insertMany([
      {
        _id: visibleProductId,
        name: 'Visible E2E product',
        description: 'Visible',
        price: 100,
        code: 'E2E-VISIBLE',
        stock: 4,
        category: visibleCategoryId,
        thumbnails: [],
        status: true,
        isVisible: true,
        tags: [],
        owner: 'historical',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: hiddenProductId,
        name: 'Hidden E2E product',
        description: 'Hidden',
        price: 200,
        code: 'E2E-HIDDEN',
        stock: 4,
        category: hiddenCategoryId,
        thumbnails: [],
        status: true,
        isVisible: false,
        tags: [],
        owner: 'historical',
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

    const catalog = await request(app.getHttpServer())
      .get('/products')
      .query({
        page: 1,
        limit: 10,
        sort: 'name',
        query: 'Visible E2E',
      })
      .expect(200);

    expect(catalog.text).toContain('Visible E2E product');
    expect(catalog.text).not.toContain('Hidden E2E product');
  });

  it('keeps recovery responses non-enumerating without a real mail service', async () => {
    const email = 'e2e-recovery@example.test';

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        first_name: 'Recovery',
        last_name: 'E2E',
        birthDate: '1990-01-01T00:00:00.000Z',
        email,
        password: 'Recovery123',
        phone: '000000003',
        avatar: '',
      })
      .expect(201);

    const known = await request(app.getHttpServer())
      .post('/users/recoveryPass')
      .send({ email })
      .expect(202);

    const unknown = await request(app.getHttpServer())
      .post('/users/recoveryPass')
      .send({ email: 'missing-e2e@example.test' })
      .expect(202);

    expect(known.body).toEqual(unknown.body);

    const persisted = await connection.collection('users').findOne(
      { email },
      { projection: { resetPasswordTokenDigest: 1 } },
    );
    expect(persisted).not.toHaveProperty('resetPasswordTokenDigest');

    await request(app.getHttpServer())
      .post('/users/resetPass')
      .send({
        token: 'invalid-token-with-more-than-thirty-two-characters',
        password: 'Replacement123',
      })
      .expect(400);

    await request(app.getHttpServer())
      .get('/resetPassword/opaque-token-that-is-only-rendered-not-consumed')
      .expect(200);
  });
});
