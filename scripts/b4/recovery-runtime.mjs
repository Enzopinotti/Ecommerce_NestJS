import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import net from 'node:net';
import path from 'node:path';
import process from 'node:process';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';

const repoRoot = process.cwd();
const distMain = path.join(repoRoot, 'dist', 'main.js');
const safeJwtKey = 'b4-local-ci-secret-with-at-least-32-characters';
const safeMongoUri =
  process.env.B4_MONGODB_URI ?? 'mongodb://127.0.0.1:27017/ecommerce_nestjs_b4';

function digestToken(rawToken) {
  return createHash('sha256').update(rawToken).digest('hex');
}

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
    APP_BASE_URL: 'https://recovery.example.test/app',
    MONGODB_URI: safeMongoUri,
    JWT_KEY: safeJwtKey,
    MAIL_ENABLED: 'false',
    SERVICE_MAIL: '',
    SERVICE_MAIL_PORT: '587',
    EMAIL_USER: '',
    EMAIL_PASSWORD: '',
  };
}

async function postJson(url, body) {
  return fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    redirect: 'manual',
  });
}

async function main() {
  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const application = spawnApplication(buildRuntimeEnv(port));
  const connection = await mongoose.createConnection(safeMongoUri).asPromise();
  const users = connection.collection('users');
  const unique = `${Date.now()}-${process.pid}`;
  const email = `b4-${unique}@example.test`;
  const missingEmail = `missing-${unique}@example.test`;
  const oldPassword = 'OldPassword1';
  const newPassword = 'NewPassword2';
  const userId = new mongoose.Types.ObjectId();

  try {
    await users.insertOne({
      _id: userId,
      first_name: 'B4',
      last_name: 'User',
      birthDate: new Date('1995-01-01T00:00:00.000Z'),
      email,
      password: await bcrypt.hash(oldPassword, 10),
      phone: '000000000',
      avatar: '',
    });

    await waitForHttp(`${baseUrl}/login`, application.child, application.output);

    const knownRecovery = await postJson(`${baseUrl}/users/recoveryPass`, { email });
    const missingRecovery = await postJson(`${baseUrl}/users/recoveryPass`, {
      email: missingEmail,
    });
    assert.equal(knownRecovery.status, 202);
    assert.equal(missingRecovery.status, 202);
    assert.deepEqual(await knownRecovery.json(), await missingRecovery.json());

    const afterUndeliverableRecovery = await users.findOne({ _id: userId });
    assert.ok(afterUndeliverableRecovery);
    assert.equal(afterUndeliverableRecovery.resetPasswordToken, undefined);
    assert.equal(afterUndeliverableRecovery.resetPasswordTokenDigest, undefined);
    assert.equal(afterUndeliverableRecovery.resetPasswordExpires, undefined);

    const rawToken = randomBytes(32).toString('base64url');
    const tokenDigest = digestToken(rawToken);
    await users.updateOne(
      { _id: userId },
      {
        $set: {
          resetPasswordTokenDigest: tokenDigest,
          resetPasswordExpires: new Date(Date.now() + 60_000),
        },
      },
    );

    const storedBeforeReset = await users.findOne({ _id: userId });
    assert.equal(storedBeforeReset.resetPasswordToken, undefined);
    assert.equal(storedBeforeReset.resetPasswordTokenDigest, tokenDigest);
    assert.notEqual(storedBeforeReset.resetPasswordTokenDigest, rawToken);

    const resetView = await fetch(
      `${baseUrl}/resetPassword/${encodeURIComponent(rawToken)}`,
    );
    assert.equal(resetView.status, 200);
    const afterView = await users.findOne({ _id: userId });
    assert.equal(afterView.resetPasswordTokenDigest, tokenDigest);

    const samePassword = await postJson(`${baseUrl}/users/resetPass`, {
      token: rawToken,
      password: oldPassword,
    });
    assert.equal(samePassword.status, 400);

    const weakPassword = await postJson(`${baseUrl}/users/resetPass`, {
      token: rawToken,
      password: 'weakpass',
    });
    assert.equal(weakPassword.status, 400);

    const validReset = await postJson(`${baseUrl}/users/resetPass`, {
      token: rawToken,
      password: newPassword,
    });
    assert.equal(validReset.status, 201);
    const validResetBody = await validReset.json();
    assert.equal(validResetBody.status, 'success');

    const afterReset = await users.findOne({ _id: userId });
    assert.ok(afterReset);
    assert.equal(await bcrypt.compare(newPassword, afterReset.password), true);
    assert.equal(afterReset.resetPasswordToken, undefined);
    assert.equal(afterReset.resetPasswordTokenDigest, undefined);
    assert.equal(afterReset.resetPasswordExpires, undefined);

    const reused = await postJson(`${baseUrl}/users/resetPass`, {
      token: rawToken,
      password: 'AnotherPassword3',
    });
    assert.equal(reused.status, 400);

    const fake = await postJson(`${baseUrl}/users/resetPass`, {
      token: randomBytes(32).toString('base64url'),
      password: 'AnotherPassword3',
    });
    assert.equal(fake.status, 400);

    const expiredRawToken = randomBytes(32).toString('base64url');
    const expiredDigest = digestToken(expiredRawToken);
    await users.updateOne(
      { _id: userId },
      {
        $set: {
          resetPasswordTokenDigest: expiredDigest,
          resetPasswordExpires: new Date(Date.now() - 1_000),
        },
      },
    );

    const expired = await postJson(`${baseUrl}/users/resetPass`, {
      token: expiredRawToken,
      password: 'AnotherPassword3',
    });
    assert.equal(expired.status, 400);
    const afterExpired = await users.findOne({ _id: userId });
    assert.equal(afterExpired.resetPasswordTokenDigest, undefined);
    assert.equal(afterExpired.resetPasswordExpires, undefined);

    const output = application.output();
    assert.doesNotMatch(output, new RegExp(rawToken, 'g'));
    assert.doesNotMatch(output, new RegExp(expiredRawToken, 'g'));
    assert.doesNotMatch(output, new RegExp(safeJwtKey, 'g'));
    assert.doesNotMatch(output, new RegExp(safeMongoUri, 'g'));
  } finally {
    await connection.close();
    if (application.child.exitCode === null) {
      application.child.kill('SIGTERM');
      await waitForExit(application.child).catch(() => undefined);
    }
  }

  console.log('B4 password recovery runtime contract passed.');
  console.log('public-response=uniform token=opaque digest=sha256-at-rest ttl=1h');
  console.log('reset=single-use expiry=checked password=bcrypt mail-failure=non-enumerating');
  console.log('raw-token=absent-from-db-and-logs reset-view=no-account-lookup');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
