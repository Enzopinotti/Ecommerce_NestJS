import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];

const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));

function expect(condition, message) {
  if (!condition) failures.push(message);
}

expect(pkg.private === true, 'package.json must remain private=true');
expect(pkg.packageManager === 'npm@11.19.0', 'packageManager must pin npm@11.19.0');
expect(pkg.engines?.node === '>=24.20.0 <25', 'Node engine must stay on the verified Node 24 range');
expect(pkg.engines?.npm === '>=11.19.0 <12', 'npm engine must stay on the verified npm 11 range');
expect(read('.nvmrc').trim() === 'v24.20.0', '.nvmrc must pin v24.20.0');
expect(read('.npmrc').split(/\r?\n/).includes('engine-strict=true'), '.npmrc must enforce engine-strict=true');

for (const [name, forbidden] of [
  ['lint', '--fix'],
  ['format:check', '--write'],
  ['quality', '--fix'],
  ['quality', '--write'],
]) {
  const script = pkg.scripts?.[name] ?? '';
  expect(!script.includes(forbidden), `${name} must remain read-only and cannot contain ${forbidden}`);
}

const envExample = read('.env.example');
for (const key of [
  'NODE_ENV',
  'PORT',
  'APP_BASE_URL',
  'MONGODB_URI',
  'JWT_KEY',
  'SERVICE_MAIL',
  'SERVICE_MAIL_PORT',
  'EMAIL_USER',
  'EMAIL_PASSWORD',
]) {
  expect(new RegExp(`^${key}=`, 'm').test(envExample), `.env.example is missing ${key}`);
}

const gitignore = read('.gitignore');
for (const rule of ['/dist', '/node_modules', '/coverage', '.env', '.env.*', '!.env.example', '*.tsbuildinfo']) {
  expect(gitignore.split(/\r?\n/).includes(rule), `.gitignore is missing ${rule}`);
}

if (failures.length > 0) {
  console.error('B1 hygiene contract failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('B1 hygiene contract passed.');
console.log(`runtime=${read('.nvmrc').trim()} packageManager=${pkg.packageManager}`);
console.log('read-only scripts and environment template are present.');
