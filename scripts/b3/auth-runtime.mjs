import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import process from 'node:process';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

const repoRoot = process.cwd();
const distMain = path.join(repoRoot, 'dist', 'main.js');
const safeJwtKey = 'b3-local-ci-secret-with-at-least-32-characters';
const safeMongoUri =
  process.env.B3_MONGODB_URI ?? 'mongodb://127.0.0.1:27017/ecommerce_nestjs_b3';

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
    APP_BASE_URL: 'https://ecommerce.example.test',
    MONGODB_URI: safeMongoUri,
    JWT_KEY: safeJwtKey,
    MAIL_ENABLED: 'false',
    SERVICE_MAIL: '',
    SERVICE_MAIL_PORT: '587',
    EMAIL_USER: '',
    EMAIL_PASSWORD: '',
  };
}

function getSetCookie(response) {
  const header = response.headers.get('set-cookie');
  assert.ok(header, 'response must set a session cookie');
  return header;
}

function cookiePair(setCookieHeader) {
  return setCookieHeader.split(';', 1)[0];
}

function cookieValue(setCookieHeader) {
  const pair = cookiePair(setCookieHeader);
  const separator = pair.indexOf('=');
  assert.ok(separator > 0, 'session cookie must contain a value');
  return pair.slice(separator + 1);
}

function assertSessionCookieContract(setCookieHeader) {
  assert.match(setCookieHeader, /^access_token=/);
  assert.match(setCookieHeader, /HttpOnly/i);
  assert.match(setCookieHeader, /Secure/i);
  assert.match(setCookieHeader, /SameSite=Lax/i);
  assert.match(setCookieHeader, /Path=\//i);
  assert.match(setCookieHeader, /Max-Age=3600/i);
}

function assertPublicAuthBody(body) {
  const serialized = JSON.stringify(body);
  assert.equal('token' in body, false);
  assert.equal('access_token' in body, false);
  assert.doesNotMatch(serialized, /password/i);
  assert.doesNotMatch(serialized, /resetPasswordToken/i);
}

async function postJson(url, body, headers = {}) {
  return fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
    redirect: 'manual',
  });
}

async function assertStoredPasswordIsSingleHash(email, plainPassword) {
  const connection = await mongoose.createConnection(safeMongoUri).asPromise();
  try {
    const stored = await connection.collection('users').findOne({ email });
    assert.ok(stored, 'registered user must exist in MongoDB');
    assert.equal(typeof stored.password, 'string');
    assert.notEqual(stored.password, plainPassword);
    assert.match(stored.password, /^\$2[aby]\$/);
    assert.equal(
      await bcrypt.compare(plainPassword, stored.password),
      true,
      'the persisted password must be one bcrypt hash of the submitted password',
    );
  } finally {
    await connection.close();
  }
}

async function main() {
  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const env = buildRuntimeEnv(port);
  const application = spawnApplication(env);
  const unique = `${Date.now()}-${process.pid}`;
  const email = `b3-${unique}@example.test`;
  const password = 'B3Password123';
  const registration = {
    first_name: 'B3',
    last_name: 'User',
    birthDate: '1995-01-01T00:00:00.000Z',
    email,
    password,
    phone: '000000000',
    avatar: '',
  };

  try {
    await waitForHttp(`${baseUrl}/login`, application.child, application.output);

    const anonymousSession = await fetch(`${baseUrl}/auth/session`);
    assert.equal(anonymousSession.status, 401);

    const registerResponse = await postJson(
      `${baseUrl}/users/register`,
      registration,
    );
    assert.equal(registerResponse.status, 201);
    const registerBody = await registerResponse.json();
    assert.equal(registerBody.status, 'success');
    assert.equal(registerBody.user.email, email);
    assertPublicAuthBody(registerBody);

    const registerSetCookie = getSetCookie(registerResponse);
    assertSessionCookieContract(registerSetCookie);
    const registrationCookie = cookiePair(registerSetCookie);
    const registrationToken = cookieValue(registerSetCookie);
    assert.ok(registrationToken.length > 40);
    assert.doesNotMatch(JSON.stringify(registerBody), new RegExp(registrationToken));

    await assertStoredPasswordIsSingleHash(email, password);

    const cookieSession = await fetch(`${baseUrl}/auth/session`, {
      headers: { cookie: registrationCookie },
    });
    assert.equal(cookieSession.status, 200);
    const sessionBody = await cookieSession.json();
    assert.equal(sessionBody.status, 'success');
    assert.equal(sessionBody.user.email, email);
    assert.equal(sessionBody.user.id, registerBody.user.id);
    assertPublicAuthBody(sessionBody);

    const bearerOnlySession = await fetch(`${baseUrl}/auth/session`, {
      headers: { authorization: `Bearer ${registrationToken}` },
    });
    assert.equal(
      bearerOnlySession.status,
      401,
      'Bearer-only auth must not bypass the cookie session authority',
    );

    const resetPurposeToken = jwt.sign(
      {
        email,
        sub: registerBody.user.id,
        purpose: 'password-reset',
      },
      safeJwtKey,
      { expiresIn: '1h' },
    );
    const resetPurposeSession = await fetch(`${baseUrl}/auth/session`, {
      headers: { cookie: `access_token=${resetPurposeToken}` },
    });
    assert.equal(
      resetPurposeSession.status,
      401,
      'a valid password-reset JWT must never authenticate as a session',
    );

    const legacyToken = jwt.sign(
      { email, sub: registerBody.user.id },
      safeJwtKey,
      { expiresIn: '1h' },
    );
    const legacySession = await fetch(`${baseUrl}/auth/session`, {
      headers: { cookie: `access_token=${legacyToken}` },
    });
    assert.equal(
      legacySession.status,
      401,
      'pre-B3 JWTs without an explicit session purpose must require re-login',
    );

    const malformedCookieSession = await fetch(`${baseUrl}/auth/session`, {
      headers: { cookie: 'access_token=not-a-jwt' },
    });
    assert.equal(malformedCookieSession.status, 401);

    const duplicateRegister = await postJson(
      `${baseUrl}/users/register`,
      registration,
    );
    assert.equal(duplicateRegister.status, 409);

    const wrongPassword = await postJson(`${baseUrl}/users/login`, {
      email,
      password: 'WrongPassword123',
    });
    assert.equal(wrongPassword.status, 401);
    assert.equal(wrongPassword.headers.get('set-cookie'), null);

    const unknownUser = await postJson(`${baseUrl}/users/login`, {
      email: `missing-${unique}@example.test`,
      password,
    });
    assert.equal(unknownUser.status, 401);

    const logoutResponse = await postJson(
      `${baseUrl}/users/logout`,
      {},
      { cookie: registrationCookie },
    );
    assert.equal(logoutResponse.status, 200);
    const logoutSetCookie = getSetCookie(logoutResponse);
    assert.match(logoutSetCookie, /^access_token=;/);
    assert.match(logoutSetCookie, /HttpOnly/i);
    assert.match(logoutSetCookie, /Secure/i);
    assert.match(logoutSetCookie, /SameSite=Lax/i);
    assert.match(logoutSetCookie, /Path=\//i);

    const loginResponse = await postJson(`${baseUrl}/auth/login`, {
      email,
      password,
    });
    assert.equal(loginResponse.status, 200);
    const loginBody = await loginResponse.json();
    assert.equal(loginBody.status, 'success');
    assert.equal(loginBody.user.email, email);
    assertPublicAuthBody(loginBody);
    const loginSetCookie = getSetCookie(loginResponse);
    assertSessionCookieContract(loginSetCookie);

    const loginCookie = cookiePair(loginSetCookie);
    const reloggedSession = await fetch(`${baseUrl}/auth/session`, {
      headers: { cookie: loginCookie },
    });
    assert.equal(reloggedSession.status, 200);

    assert.doesNotMatch(application.output(), new RegExp(safeJwtKey, 'g'));
    assert.doesNotMatch(application.output(), new RegExp(safeMongoUri, 'g'));
    assert.doesNotMatch(application.output(), new RegExp(registrationToken, 'g'));
  } finally {
    if (application.child.exitCode === null) {
      application.child.kill('SIGTERM');
      await waitForExit(application.child).catch(() => undefined);
    }
  }

  console.log('B3 auth runtime contract passed.');
  console.log('authority=cookie-only jwt=single-registration identity=sub purpose=session');
  console.log('register=201 login=200 invalid=401 duplicate=409 logout=clear-cookie');
  console.log('responses=no-token persistence=single-bcrypt-hash reset-token=rejected');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
