import { getConnectionToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import bcrypt from 'bcrypt';
import { Connection, Types } from 'mongoose';
import { AppModule } from '../../src/app.module';
import { CategoriesService } from '../../src/categories/categories.service';
import { ProductQueryDto } from '../../src/products/dto/product-query.dto';
import { ProductsService } from '../../src/products/products.service';
import { CreateUserDto } from '../../src/users/dto/create-user.dto';
import { UsersService } from '../../src/users/users.service';

describe('Mongo integration contracts', () => {
  let moduleRef: TestingModule;
  let connection: Connection;
  let categoriesService: CategoriesService;
  let productsService: ProductsService;
  let usersService: UsersService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    connection = moduleRef.get<Connection>(getConnectionToken());
    categoriesService = moduleRef.get(CategoriesService);
    productsService = moduleRef.get(ProductsService);
    usersService = moduleRef.get(UsersService);
  });

  beforeEach(async () => {
    await Promise.all([
      connection.collection('users').deleteMany({}),
      connection.collection('categories').deleteMany({}),
      connection.collection('products').deleteMany({}),
    ]);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  it('keeps hidden categories outside the maintained catalog service', async () => {
    const visibleId = new Types.ObjectId();
    const hiddenId = new Types.ObjectId();

    await connection.collection('categories').insertMany([
      {
        _id: visibleId,
        nameCategory: 'Visible integration category',
        isVisible: true,
        createdAt: new Date(),
        description: 'Visible',
      },
      {
        _id: hiddenId,
        nameCategory: 'Hidden integration category',
        isVisible: false,
        createdAt: new Date(),
        description: 'Hidden',
      },
    ]);

    const categories = await categoriesService.findAll();

    expect(categories).toHaveLength(1);
    expect(String(categories[0]._id)).toBe(String(visibleId));
    await expect(
      categoriesService.findOne(hiddenId.toString()),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('applies visible-only product filtering and bounded pagination against Mongo', async () => {
    const categoryId = new Types.ObjectId();
    const visibleId = new Types.ObjectId();
    const hiddenId = new Types.ObjectId();

    await connection.collection('categories').insertOne({
      _id: categoryId,
      nameCategory: 'Integration category',
      isVisible: true,
      createdAt: new Date(),
      description: 'Integration',
    });

    await connection.collection('products').insertMany([
      {
        _id: visibleId,
        name: 'Integration Visible Product',
        description: 'Visible',
        price: 10,
        code: 'INT-VISIBLE',
        stock: 3,
        category: categoryId,
        thumbnails: [],
        status: true,
        isVisible: true,
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: hiddenId,
        name: 'Integration Hidden Product',
        description: 'Hidden',
        price: 20,
        code: 'INT-HIDDEN',
        stock: 3,
        category: categoryId,
        thumbnails: [],
        status: true,
        isVisible: false,
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const query = new ProductQueryDto();
    query.page = 1;
    query.limit = 10;
    query.sort = 'name';
    query.query = 'Integration';

    const page = await productsService.findAllView(query);

    expect(page.totalDocs).toBe(1);
    expect(page.products).toHaveLength(1);
    expect(String(page.products[0]._id)).toBe(String(visibleId));
    await expect(
      productsService.findOne(hiddenId.toString()),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('hashes credentials once and keeps password out of normal user lookup', async () => {
    const password = 'IntegrationPassword1';
    const email = 'integration-user@example.test';
    const dto: CreateUserDto = {
      first_name: 'Integration',
      last_name: 'User',
      birthDate: new Date('1995-01-01T00:00:00.000Z'),
      email,
      password,
      phone: '000000000',
      avatar: '',
    };

    await usersService.create(dto);

    const publicLookup = await usersService.findByEmail(email);
    const authLookup = await usersService.findByEmailForAuthentication(email);

    expect(publicLookup).not.toBeNull();
    expect(publicLookup?.password).toBeUndefined();
    expect(authLookup?.password).toBeDefined();
    expect(await bcrypt.compare(password, String(authLookup?.password))).toBe(
      true,
    );
  });
});
