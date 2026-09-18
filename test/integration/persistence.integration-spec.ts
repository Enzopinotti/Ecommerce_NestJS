import { Test, TestingModule } from '@nestjs/testing';
import { getConnectionToken } from '@nestjs/mongoose';
import bcrypt from 'bcrypt';
import { Connection, Types } from 'mongoose';
import { AppModule } from '../../src/app.module';
import { CategoriesService } from '../../src/categories/categories.service';
import { MailService } from '../../src/mail/mail.service';
import { ProductQueryDto } from '../../src/products/dto/product-query.dto';
import { ProductsService } from '../../src/products/products.service';
import { PasswordRecoveryService } from '../../src/users/password-recovery.service';
import { UsersService } from '../../src/users/users.service';

describe('Mongo integration contracts', () => {
  let moduleRef: TestingModule;
  let connection: Connection;
  let usersService: UsersService;
  let productsService: ProductsService;
  let categoriesService: CategoriesService;
  let recoveryService: PasswordRecoveryService;
  const sendMail = jest.fn<Promise<void>, [string, string, string]>();

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MailService)
      .useValue({ sendMail })
      .compile();

    connection = moduleRef.get<Connection>(getConnectionToken());
    usersService = moduleRef.get(UsersService, { strict: false });
    productsService = moduleRef.get(ProductsService, { strict: false });
    categoriesService = moduleRef.get(CategoriesService, { strict: false });
    recoveryService = moduleRef.get(PasswordRecoveryService, { strict: false });
  });

  beforeEach(async () => {
    sendMail.mockReset();
    sendMail.mockResolvedValue(undefined);

    await Promise.all([
      connection.collection('users').deleteMany({}),
      connection.collection('products').deleteMany({}),
      connection.collection('categories').deleteMany({}),
    ]);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  it('persists exactly one password hash and keeps it out of normal user reads', async () => {
    const email = 'integration-user@example.test';
    const password = 'Integration123';

    await usersService.create({
      first_name: 'Integration',
      last_name: 'User',
      birthDate: new Date('1995-01-01T00:00:00.000Z'),
      email,
      password,
      phone: '000000000',
      avatar: '',
    });

    const stored = await connection
      .collection('users')
      .findOne({ email }, { projection: { password: 1, email: 1 } });

    expect(stored).not.toBeNull();
    expect(stored?.password).not.toBe(password);
    expect(await bcrypt.compare(password, String(stored?.password))).toBe(true);

    const publicRead = await usersService.findByEmail(email);
    expect(publicRead).not.toBeNull();
    expect(publicRead?.toObject()).not.toHaveProperty('password');
    expect(publicRead?.toObject()).not.toHaveProperty(
      'resetPasswordTokenDigest',
    );
  });

  it('stores only a reset digest and consumes the recovery credential once', async () => {
    const email = 'integration-recovery@example.test';
    const originalPassword = 'Original123';
    const replacementPassword = 'Replacement456';

    await usersService.create({
      first_name: 'Recovery',
      last_name: 'User',
      birthDate: new Date('1994-02-02T00:00:00.000Z'),
      email,
      password: originalPassword,
      phone: '000000001',
      avatar: '',
    });

    await recoveryService.requestReset(email);

    expect(sendMail).toHaveBeenCalledTimes(1);
    const [, , body] = sendMail.mock.calls[0];
    const urlMatch = body.match(/https?:\/\/\S+\/resetPassword\/([^\s]+)/);
    expect(urlMatch).not.toBeNull();

    const rawToken = decodeURIComponent(String(urlMatch?.[1]));
    const storedBeforeReset = await connection.collection('users').findOne(
      { email },
      {
        projection: {
          password: 1,
          resetPasswordTokenDigest: 1,
          resetPasswordExpires: 1,
        },
      },
    );

    expect(storedBeforeReset?.resetPasswordTokenDigest).toHaveLength(64);
    expect(storedBeforeReset?.resetPasswordTokenDigest).not.toBe(rawToken);
    expect(JSON.stringify(storedBeforeReset)).not.toContain(rawToken);

    await recoveryService.resetPassword(rawToken, replacementPassword);

    const storedAfterReset = await connection.collection('users').findOne(
      { email },
      {
        projection: {
          password: 1,
          resetPasswordTokenDigest: 1,
          resetPasswordExpires: 1,
        },
      },
    );

    expect(
      await bcrypt.compare(
        replacementPassword,
        String(storedAfterReset?.password),
      ),
    ).toBe(true);
    expect(storedAfterReset).not.toHaveProperty('resetPasswordTokenDigest');
    expect(storedAfterReset).not.toHaveProperty('resetPasswordExpires');

    await expect(
      recoveryService.resetPassword(rawToken, 'AnotherPassword789'),
    ).rejects.toThrow('Invalid or expired recovery token');
  });

  it('keeps visible catalog persistence separate from hidden resources', async () => {
    const visibleCategoryId = new Types.ObjectId();
    const hiddenCategoryId = new Types.ObjectId();
    const visibleProductId = new Types.ObjectId();
    const hiddenProductId = new Types.ObjectId();

    await connection.collection('categories').insertMany([
      {
        _id: visibleCategoryId,
        nameCategory: 'Visible integration category',
        isVisible: true,
        description: 'Visible',
        createdAt: new Date(),
      },
      {
        _id: hiddenCategoryId,
        nameCategory: 'Hidden integration category',
        isVisible: false,
        description: 'Hidden',
        createdAt: new Date(),
      },
    ]);

    await connection.collection('products').insertMany([
      {
        _id: visibleProductId,
        name: 'Visible integration product',
        description: 'Visible',
        price: 100,
        code: 'INTEGRATION-VISIBLE',
        stock: 5,
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
        name: 'Hidden integration product',
        description: 'Hidden',
        price: 200,
        code: 'INTEGRATION-HIDDEN',
        stock: 5,
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

    const categories = await categoriesService.findAll();
    expect(categories).toHaveLength(1);
    expect(String(categories[0]._id)).toBe(String(visibleCategoryId));

    await expect(
      productsService.findOne(String(hiddenProductId)),
    ).rejects.toThrow('Product not found');

    const visibleProduct = await productsService.findOne(
      String(visibleProductId),
    );
    expect(visibleProduct.name).toBe('Visible integration product');

    const query = new ProductQueryDto();
    query.page = 1;
    query.limit = 10;
    query.sort = 'name';
    query.query = 'Visible integration';

    const result = await productsService.findAllView(query);
    expect(result.products).toHaveLength(1);
    expect(result.products[0].name).toBe('Visible integration product');
  });

  it('does not invoke mail delivery for an unknown recovery identity', async () => {
    await recoveryService.requestReset('missing@example.test');
    expect(sendMail).not.toHaveBeenCalled();
  });
});
