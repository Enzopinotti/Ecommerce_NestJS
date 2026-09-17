# Ecommerce NestJS

Historical backend-learning project built with **NestJS + TypeScript + MongoDB/Mongoose**.

The repository started from the Nest starter, but the application grew beyond that scaffold: it contains ecommerce-oriented areas for authentication, users, products, categories, mail and historical cart experiments. This README documents the repository itself instead of the generic Nest framework template.

## Stack

- NestJS 10
- TypeScript
- MongoDB + Mongoose
- JWT / Passport
- bcrypt
- class-validator / class-transformer
- Nodemailer
- Winston
- Jest / Supertest
- Node.js 24 + npm 11 for the 2026 maintenance lane

## Repository structure

The maintained runtime includes dedicated areas for:

- `auth/`
- `users/`
- `products/`
- `categories/`
- `mail/`
- `middleware/`
- configuration and shared utilities

Historical `carts/` scaffold source remains in the repository for learning history, but B5 deliberately removed it from the active runtime because it did not implement a real cart domain.

This is an academic/learning backend, not the authoritative backend for my current ecommerce work.

## Reproducible local setup

The maintained toolchain is pinned by `.nvmrc`, `package.json#engines` and `packageManager`:

```bash
nvm use
node --version
npm --version
npm ci
```

The verified maintenance toolchain is Node `v24.20.0` and npm `11.19.0`. `.npmrc` uses `engine-strict=true`, so unsupported Node/npm versions fail instead of silently drifting.

Create a local environment file from the safe template:

```bash
cp .env.example .env
```

Required application values are:

- `MONGODB_URI` using `mongodb://` or `mongodb+srv://`;
- `JWT_KEY` with at least 32 characters;
- `APP_BASE_URL` as an absolute `http://` or `https://` URL.

`NODE_ENV` defaults to `development`, `PORT` defaults to `3000`, and `MAIL_ENABLED` defaults to `false`. Mail credentials are required only when `MAIL_ENABLED=true`. Invalid or missing required configuration stops bootstrap before the HTTP server listens, and bootstrap errors do not print secret values.

Do not commit real credentials, JWT secrets or database credentials.

Development mode:

```bash
npm run start:dev
```

Production build and runtime:

```bash
npm run build
npm run start:prod
```

B2 packages Handlebars views and public assets into `dist/`; production no longer depends on `src/views` or `src/public` being present beside the compiled application. The runtime also reads its listening port from validated configuration and keeps Handlebars prototype property/method access disabled.

## Authentication and recovery contracts

B3 consolidates authentication under one `AuthModule`, one `AuthService`, one JWT strategy and one guard.

The server-rendered application uses the `access_token` HttpOnly cookie as its browser-session authority. Bearer-only requests do not authenticate that session. Session JWTs carry `purpose: "session"`, resolve identity through `sub`, and never validate a password as part of session lookup. Non-session-purpose or legacy purpose-less JWTs are rejected as sessions.

Registration creates the account but does not automatically log the browser in. Login creates the hardened cookie; auth JSON responses do not return the JWT. Browser logout is a POST mutation that clears the same cookie and redirects to `/login`, and `/profile` is guarded explicitly.

B4 separates password recovery from session JWT authority. Recovery uses a 32-byte opaque random token, stores only its SHA-256 digest plus expiry, returns the same public `202` response for known and unknown emails, builds links from `APP_BASE_URL`, and consumes valid reset state atomically exactly once. Raw reset tokens are not stored in MongoDB and sensitive path/query values are redacted from request logs.

## Maintained domain surface

B5 makes the HTTP surface deliberately smaller and truthful instead of preserving generated CRUD as if it were production authority.

- recovery/reset remain public under the B4 credential contract;
- `/profile` remains session-protected;
- products and categories expose read-only public catalog contracts;
- hidden catalog resources are not exposed;
- Mongo resources use ObjectId semantics;
- product pagination/search/sort are validated and bounded;
- global user CRUD and product/category mutations with no legitimate authority are not exposed;
- historical cart scaffold routes are inactive;
- ordinary user projections exclude password and password-reset state.

No admin, premium, payment or transactional cart role was invented merely to keep historical endpoints alive.

## Quality commands

The maintenance lane separates checks from commands that modify files:

```bash
npm run typecheck
npm run typecheck:all
npm run format:check
npm run format:write
npm run lint
npm run lint:fix
npm run test:unit
npm run test:e2e
npm run quality
npm run test:b2:runtime
npm run test:b3:auth
npm run test:b4:recovery
npm run test:b5:domain
```

`npm run quality` requires hygiene, deployable-source typechecking, build, lint debt non-regression and the full unit suite. Historical lint moved from 474 errors at B0 to 382 at B2, 182 at B3, 141 at B4 and **122 at B5**.

B5 also repaired the last four red scaffold unit suites. The maintained unit floor is now **14/14 suites and 38/38 tests passing with zero failures**. Later blocks may add coverage but may not delete tests or reintroduce failures below that floor.

Runtime contracts execute the compiled production application against isolated MongoDB and cumulatively protect configuration/bootstrap (B2), browser authentication (B3), password recovery (B4) and API/domain truth (B5).

Full-project typecheck, formatting and production dependency audit remain explicit inventories until their owning blocks repair them. A green blocking workflow does not claim those inventories are already clean.

Modernization evidence:

- [`docs/modernization-2026/b0-baseline.md`](docs/modernization-2026/b0-baseline.md)
- [`docs/modernization-2026/b1-toolchain-quality.md`](docs/modernization-2026/b1-toolchain-quality.md)
- [`docs/modernization-2026/b2-config-runtime.md`](docs/modernization-2026/b2-config-runtime.md)
- [`docs/modernization-2026/b3-auth-authority.md`](docs/modernization-2026/b3-auth-authority.md)
- [`docs/modernization-2026/b4-recovery-mail.md`](docs/modernization-2026/b4-recovery-mail.md)
- [`docs/modernization-2026/b5-authority-matrix.md`](docs/modernization-2026/b5-authority-matrix.md)

## Portfolio status

This repository is preserved as a **framework-specific backend learning artifact**. It is intentionally not being expanded into a new production ecommerce system just to make the repository look newer.

B0–B5 established a reproducible Node 24 runtime, permanent quality gates, production artifact contract, coherent authentication, secure password recovery and a truthful read-oriented domain surface. The next executable block is **B6 — TypeScript and 2026 dependency ratchet**.

Portfolio coordination: [`Enzopinotti/Enzopinotti#19`](https://github.com/Enzopinotti/Enzopinotti/issues/19)

## Author

Enzo Pinotti
