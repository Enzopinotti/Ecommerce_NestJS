import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import process from 'node:process';
import mongoose from 'mongoose';

const repoRoot = process.cwd();
const distMain = path.join(repoRoot, 'dist', 'main.js');
const safeMongoUri =
  process.env.B5_MONGODB_URI ?? 'mongodb://127.0.0.1:27017/ecommerce_nestjs_b5';
const safeJwtKey = 'b5-domain-contract-secret-with-at-least-32-characters';

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      assert.ok(address && typeof address !== 'string');
      const { port } = address;
      server.close((error) => (error ? reject(error) : resolve(port)));
    });
  });
}

function spawnApplication(env) {
  const child = spawn(process.execPath, [distMain], {
    cwd: repoRoot,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => {
    stdout += chunk.toString();
  });
  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
  });

  return { child, output: () => `${stdout}\n${stderr}` };
}

function waitForExit(child, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error('Process did not exit within the expected time'));
    }, timeoutMs);
    child.once('exit', (code, signal) => {
      clearTimeout(timeout);
      resolve({ code, signal });
    });
  });
}

async function waitForHttp(url, child, output, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(
        `Application exited before becoming ready (code=${child.exitCode}).\n${output()}`,
      );
    }
    try {
      const response = await fetch(url, { redirect: 'manual' });
      if (response.status >= 200 && response.status < 500) return response;
    } catch {
      // Socket not ready yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for ${url}.\n${output()}`);
}

function buildRuntimeEnv(port) {
  return {
    ...process.env,
    NODE_ENV: 'production',
    PORT: String(port),
    APP_BASE_URL: 'https://domain.example.test',
    MONGODB_URI: safeMongoUri,
    JWT_KEY: safeJwtKey,
    MAIL_ENABLED: 'false',
    SERVICE_MAIL: '',
    SERVICE_MAIL_PORT: '587',
    EMAIL_USER: '',
    EMAIL_PASSWORD: '',
  };
}

async function request(baseUrl, pathname, options = {}) {
  return fetch(`${baseUrl}${pathname}`, {
    redirect: 'manual',
    ...options,
    headers: {
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...(options.headers ?? {}),
    },
  });
}

async function expectStatus(baseUrl, pathname, status, options) {
  const response = await request(baseUrl, pathname, options);
  assert.equal(
    response.status,
    status,
    `${options?.method ?? 'GET'} ${pathname} expected ${status}, got ${response.status}`,
  );
  return response;
}

async function main() {
  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const application = spawnApplication(buildRuntimeEnv(port));
  const connection = await mongoose.createConnection(safeMongoUri).asPromise();
  const categories = connection.collection('categories');
  const products = connection.collection('products');
  const unique = `${Date.now()}-${process.pid}`;

  const visibleCategoryId = new mongoose.Types.ObjectId();
  const hiddenCategoryId = new mongoose.Types.ObjectId();
  const visibleProductId = new mongoose.Types.ObjectId();
  const hiddenProductId = new mongoose.Types.ObjectId();
  const userId = new mongoose.Types.ObjectId();
  const visibleName = `B5Visible-${unique}`;
  const hiddenName = `B5Hidden-${unique}`;

  try {
    await connection.collection('users').insertOne({
      _id: userId,
      first_name: 'Private',
      last_name: 'User',
      birthDate: new Date('1995-01-01T00:00:00.000Z'),
      email: `private-${unique}@example.test`,
      password: 'must-never-be-listed',
      resetPasswordTokenDigest: 'must-never-be-listed',
      resetPasswordExpires: new Date(Date.now() + 60_000),
    });

    await categories.insertMany([
      {
        _id: visibleCategoryId,
        nameCategory: `Visible-${unique}`,
        isVisible: true,
        createdAt: new Date(),
        description: 'Visible category',
      },
      {
        _id: hiddenCategoryId,
        nameCategory: `Hidden-${unique}`,
        isVisible: false,
        createdAt: new Date(),
        description: 'Hidden category',
      },
    ]);

    await products.insertMany([
      {
        _id: visibleProductId,
        name: visibleName,
        description: 'Visible product',
        price: 100,
        code: `VISIBLE-${unique}`,
        stock: 5,
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
        name: hiddenName,
        description: 'Hidden product',
        price: 200,
        code: `HIDDEN-${unique}`,
        stock: 4,
        category: hiddenCategoryId,
        thumbnails: [],
        status: true,
        isVisible: false,
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    await waitForHttp(`${baseUrl}/login`, application.child, application.output);

    await expectStatus(baseUrl, '/users', 404);
    await expectStatus(baseUrl, `/users/${userId}`, 404);
    await expectStatus(baseUrl, `/users/${userId}`, 404, {
      method: 'PATCH',
      body: JSON.stringify({ first_name: 'Changed' }),
    });
    await expectStatus(baseUrl, `/users/${userId}`, 404, { method: 'DELETE' });

    const categoryListResponse = await expectStatus(baseUrl, '/categories', 200);
    const categoryList = await categoryListResponse.json();
    assert.equal(categoryList.length, 1);
    assert.equal(String(categoryList[0]._id), String(visibleCategoryId));
    assert.doesNotMatch(JSON.stringify(categoryList), new RegExp(String(hiddenCategoryId)));

    await expectStatus(baseUrl, `/categories/${visibleCategoryId}`, 200);
    await expectStatus(baseUrl, `/categories/${hiddenCategoryId}`, 404);
    await expectStatus(baseUrl, '/categories/not-an-object-id', 400);
    await expectStatus(baseUrl, '/categories', 404, {
      method: 'POST',
      body: JSON.stringify({ nameCategory: 'No authority' }),
    });
    await expectStatus(baseUrl, `/categories/${visibleCategoryId}`, 404, {
      method: 'PATCH',
      body: JSON.stringify({ nameCategory: 'No authority' }),
    });
    await expectStatus(baseUrl, `/categories/${visibleCategoryId}`, 404, {
      method: 'DELETE',
    });

    const visibleProductResponse = await expectStatus(
      baseUrl,
      `/products/${visibleProductId}`,
      200,
    );
    const visibleProduct = await visibleProductResponse.json();
    assert.equal(visibleProduct.name, visibleName);
    await expectStatus(baseUrl, `/products/${hiddenProductId}`, 404);
    await expectStatus(baseUrl, '/products/not-an-object-id', 400);
    await expectStatus(baseUrl, '/products', 404, {
      method: 'POST',
      body: JSON.stringify({ name: 'No authority' }),
    });
    await expectStatus(baseUrl, `/products/${visibleProductId}`, 404, {
      method: 'PATCH',
      body: JSON.stringify({ price: 1 }),
    });
    await expectStatus(baseUrl, `/products/${visibleProductId}`, 404, {
      method: 'DELETE',
    });

    await expectStatus(baseUrl, '/products?limit=51', 400);
    await expectStatus(baseUrl, '/products?sort=owner', 400);
    await expectStatus(baseUrl, `/products?query=${'x'.repeat(81)}`, 400);

    const catalogResponse = await expectStatus(
      baseUrl,
      `/products?page=1&limit=1&sort=name&query=${encodeURIComponent(visibleName)}`,
      200,
    );
    const catalogHtml = await catalogResponse.text();
    assert.match(catalogHtml, new RegExp(visibleName));
    assert.doesNotMatch(catalogHtml, new RegExp(hiddenName));
    assert.doesNotMatch(catalogHtml, /Administrar Productos|Agregar al carrito|Convertirse en Premium/);

    await expectStatus(baseUrl, '/carts', 404);
    await expectStatus(baseUrl, '/carts/1', 404);
    await expectStatus(baseUrl, '/carts', 404, {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const output = application.output();
    assert.doesNotMatch(output, /must-never-be-listed/);
    assert.doesNotMatch(output, new RegExp(safeJwtKey));
    assert.doesNotMatch(output, new RegExp(safeMongoUri));
  } finally {
    await connection.close();
    if (application.child.exitCode === null) {
      application.child.kill('SIGTERM');
      await waitForExit(application.child).catch(() => undefined);
    }
  }

  console.log('B5 domain truth runtime contract passed.');
  console.log('users=not-public products=read-only-visible categories=read-only-visible carts=inactive');
  console.log('object-id=validated pagination=bounded sort=allow-listed search=escaped');
  console.log('ui=no-fake-admin-premium-cart credential-fields=not-public');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
