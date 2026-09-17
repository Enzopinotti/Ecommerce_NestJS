import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { access, rename } from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import process from 'node:process';

const repoRoot = process.cwd();
const distMain = path.join(repoRoot, 'dist', 'main.js');
const distLoginView = path.join(repoRoot, 'dist', 'views', 'login.handlebars');
const distMainLayout = path.join(
  repoRoot,
  'dist',
  'views',
  'layouts',
  'main.handlebars',
);
const distLoginCss = path.join(repoRoot, 'dist', 'public', 'css', 'login.css');
const sourceViews = path.join(repoRoot, 'src', 'views');
const sourcePublic = path.join(repoRoot, 'src', 'public');
const hiddenViews = path.join(repoRoot, 'src', 'views.__b2_hidden');
const hiddenPublic = path.join(repoRoot, 'src', 'public.__b2_hidden');

const safeJwtKey = 'b2-local-ci-secret-with-at-least-32-characters';
const safeMongoUri =
  process.env.B2_MONGODB_URI ?? 'mongodb://127.0.0.1:27017/ecommerce_nestjs_b2';

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      assert.ok(address && typeof address !== 'string');
      const { port } = address;
      server.close((error) => {
        if (error) reject(error);
        else resolve(port);
      });
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

  return {
    child,
    output: () => `${stdout}\n${stderr}`,
  };
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
      if (response.status >= 200 && response.status < 500) {
        return response;
      }
    } catch {
      // The socket is not ready yet.
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`Timed out waiting for ${url}.\n${output()}`);
}

function buildRuntimeEnv(port) {
  return {
    ...process.env,
    NODE_ENV: 'test',
    PORT: String(port),
    APP_BASE_URL: `http://127.0.0.1:${port}`,
    MONGODB_URI: safeMongoUri,
    JWT_KEY: safeJwtKey,
    MAIL_ENABLED: 'false',
    SERVICE_MAIL: '',
    SERVICE_MAIL_PORT: '587',
    EMAIL_USER: '',
    EMAIL_PASSWORD: '',
  };
}

async function assertBootstrapFailsBeforeListen(missingKey) {
  const port = await getFreePort();
  const env = buildRuntimeEnv(port);
  delete env[missingKey];

  const processHandle = spawnApplication(env);
  const result = await waitForExit(processHandle.child);

  assert.notEqual(result.code, 0, `${missingKey} must fail startup`);
  assert.doesNotMatch(processHandle.output(), new RegExp(safeJwtKey, 'g'));
  assert.doesNotMatch(processHandle.output(), new RegExp(safeMongoUri, 'g'));

  await assert.rejects(
    fetch(`http://127.0.0.1:${port}/login`),
    `${missingKey} failure must happen before the application listens`,
  );
}

async function hideSourceAssets() {
  await rename(sourceViews, hiddenViews);
  try {
    await rename(sourcePublic, hiddenPublic);
  } catch (error) {
    await rename(hiddenViews, sourceViews);
    throw error;
  }
}

async function restoreSourceAssets() {
  await rename(hiddenViews, sourceViews).catch(() => undefined);
  await rename(hiddenPublic, sourcePublic).catch(() => undefined);
}

async function main() {
  await access(distMain);
  await access(distLoginView);
  await access(distMainLayout);
  await access(distLoginCss);

  const { validateEnvironment } = await import(
    '../../dist/config/environment.js'
  );

  const normalized = validateEnvironment({
    MONGODB_URI: safeMongoUri,
    JWT_KEY: safeJwtKey,
    APP_BASE_URL: 'http://localhost:3000/',
  });

  assert.equal(normalized.NODE_ENV, 'development');
  assert.equal(normalized.PORT, 3000);
  assert.equal(normalized.APP_BASE_URL, 'http://localhost:3000');
  assert.equal(normalized.MAIL_ENABLED, false);

  assert.throws(
    () =>
      validateEnvironment({
        MONGODB_URI: safeMongoUri,
        APP_BASE_URL: 'http://localhost:3000',
      }),
    /JWT_KEY is required/,
  );
  assert.throws(
    () =>
      validateEnvironment({
        JWT_KEY: safeJwtKey,
        APP_BASE_URL: 'http://localhost:3000',
      }),
    /MONGODB_URI is required/,
  );
  assert.throws(
    () =>
      validateEnvironment({
        MONGODB_URI: safeMongoUri,
        JWT_KEY: safeJwtKey,
        APP_BASE_URL: 'http://localhost:3000',
        PORT: '70000',
      }),
    /PORT must be an integer between 1 and 65535/,
  );
  assert.throws(
    () =>
      validateEnvironment({
        MONGODB_URI: safeMongoUri,
        JWT_KEY: safeJwtKey,
        APP_BASE_URL: 'http://localhost:3000',
        MAIL_ENABLED: 'true',
      }),
    /SERVICE_MAIL is required/,
  );

  await assertBootstrapFailsBeforeListen('JWT_KEY');
  await assertBootstrapFailsBeforeListen('MONGODB_URI');

  const port = await getFreePort();
  const env = buildRuntimeEnv(port);
  let application;

  await hideSourceAssets();
  try {
    application = spawnApplication(env);
    const loginResponse = await waitForHttp(
      `http://127.0.0.1:${port}/login`,
      application.child,
      application.output,
    );
    assert.equal(loginResponse.status, 200);
    const loginHtml = await loginResponse.text();
    assert.match(loginHtml, /Login/i);

    const cssResponse = await fetch(`http://127.0.0.1:${port}/css/login.css`);
    assert.equal(cssResponse.status, 200);
    const cssBody = await cssResponse.text();
    assert.ok(cssBody.length > 100, 'login.css should be served from dist/public');

    const extraFieldResponse = await fetch(
      `http://127.0.0.1:${port}/users/login`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: 'b2@example.test',
          password: 'valid-shape-only',
          unexpected: 'blocked',
        }),
      },
    );
    assert.equal(extraFieldResponse.status, 400);

    const invalidTypeResponse = await fetch(
      `http://127.0.0.1:${port}/users/login`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: 'b2@example.test',
          password: 12345,
        }),
      },
    );
    assert.equal(invalidTypeResponse.status, 400);

    assert.match(
      application.output(),
      new RegExp(`Application listening on configured port ${port}`),
    );
    assert.doesNotMatch(application.output(), new RegExp(safeJwtKey, 'g'));
    assert.doesNotMatch(application.output(), new RegExp(safeMongoUri, 'g'));
  } finally {
    if (application?.child && application.child.exitCode === null) {
      application.child.kill('SIGTERM');
      await waitForExit(application.child).catch(() => undefined);
    }
    await restoreSourceAssets();
  }

  console.log('B2 runtime contract passed.');
  console.log('config=fail-fast port=configured validation=global');
  console.log('views=dist static=dist source-assets=hidden-during-smoke');
}

main().catch(async (error) => {
  await restoreSourceAssets();
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
