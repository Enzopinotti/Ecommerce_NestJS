# Ecommerce NestJS

Historical backend-learning project built with **NestJS + TypeScript + MongoDB/Mongoose**.

The repository started from the Nest starter, but the application grew beyond that scaffold: it contains ecommerce-oriented modules for authentication, users, products, categories, carts and mail. This README documents the repository itself instead of the generic Nest framework template.

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

The current source includes dedicated areas for:

- `auth/`
- `users/`
- `products/`
- `categories/`
- `carts/`
- `mail/`
- `middleware/`
- configuration and shared utilities

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

The B2 runtime validates configuration before the application starts. The required application values are:

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

The server-rendered application uses the `access_token` HttpOnly cookie as its only browser-session authority. Bearer-only requests do not authenticate that session. Session JWTs carry an explicit `purpose: "session"`, resolve identity through `sub`, and never validate a password as part of session lookup. Non-session-purpose or legacy purpose-less JWTs are rejected as sessions.

Registration creates the account but does not automatically log the browser in. Login creates the hardened cookie; auth JSON responses do not return the JWT. Browser logout is a POST mutation that clears the same cookie and redirects to `/login`, and `/profile` is guarded explicitly instead of relying on a global Passport middleware side effect.

B4 separates password recovery from session JWT authority. Recovery uses a 32-byte opaque random token, stores only its SHA-256 digest plus expiry, returns the same public `202` response for known and unknown emails, builds links from `APP_BASE_URL`, and consumes valid reset state atomically exactly once. Raw reset tokens are not stored in MongoDB and sensitive path/query values are redacted from request logs.

If mail delivery fails, the just-created recovery digest is cleared and the public response remains non-enumerating. Reset validation occurs on the mutation, not while rendering the reset form. The maintained contract also rejects the previous password, enforces the existing password policy and persists the new password as bcrypt.

## Quality commands

The maintenance lane separates checks from commands that modify files:

```bash
npm run typecheck          # deployable source contract (tsconfig.build.json)
npm run typecheck:all      # includes historical tests; currently exposes known e2e debt
npm run format:check       # read-only
npm run format:write       # explicit mutation
npm run lint               # read-only
npm run lint:fix           # explicit mutation
npm run test:unit
npm run test:e2e
npm run quality            # blocking static local/CI contract
npm run test:b2:runtime    # production artifact + runtime contract; requires reachable MongoDB
npm run test:b3:auth       # auth/session production runtime contract; requires reachable MongoDB
npm run test:b4:recovery   # password-recovery production runtime contract; requires reachable MongoDB
```

`npm run quality` requires hygiene, deployable-source typechecking and build to pass. It also ratchets known historical lint/unit debt so those areas may improve but may not regress. B0 began with 474 lint errors, B2 closed at 382, B3 at 182 and B4 at **141**. The B4 unit ratchet preserves 14 suites with at least 10 passing and at most 4 failing, and 33 tests with at least 29 passing and at most 4 failing.

`npm run test:b2:runtime` builds the real production artifact and validates fail-fast configuration, configurable port, global DTO validation, compiled Handlebars views and compiled static assets. In GitHub Actions it runs against an isolated MongoDB service and temporarily hides the source view/static directories so accidental runtime dependencies on `src/` cannot pass unnoticed.

`npm run test:b3:auth` builds the same production artifact and validates the cookie-only JWT authority against an isolated MongoDB service: single-hash registration, 401/409 semantics, secure cookie flags, guarded session/profile identity, POST logout, token-purpose separation and token-free auth responses.

`npm run test:b4:recovery` validates the recovery boundary against isolated MongoDB: non-enumerating public responses, digest-only storage, expiry, atomic single use, password hashing, stale-state cleanup and absence of raw reset tokens or test secrets from application logs.

The permanent GitHub Actions workflow also runs full-project typecheck, formatting and the production dependency audit as explicit debt inventories. Their known failures remain visible until dedicated modernization blocks repair them; a green workflow does not mean that historical e2e, formatting or supply-chain debt has been erased.

Modernization evidence:

- [`docs/modernization-2026/b0-baseline.md`](docs/modernization-2026/b0-baseline.md)
- [`docs/modernization-2026/b1-toolchain-quality.md`](docs/modernization-2026/b1-toolchain-quality.md)
- [`docs/modernization-2026/b2-config-runtime.md`](docs/modernization-2026/b2-config-runtime.md)
- [`docs/modernization-2026/b3-auth-authority.md`](docs/modernization-2026/b3-auth-authority.md)
- [`docs/modernization-2026/b4-recovery-mail.md`](docs/modernization-2026/b4-recovery-mail.md)

## Portfolio status

This repository is preserved as a **framework-specific backend learning artifact**. It is intentionally not being expanded into a new production ecommerce system just to make the repository look newer.

The active 2026 maintenance lane focuses on:

- dependency/runtime compatibility;
- configuration and secret hygiene;
- validating which tests still represent real behavior;
- tightening API/auth boundaries where useful;
- documenting historical versus maintained behavior;
- avoiding duplication with the already-modernized Meow Matrix full-stack ecommerce lineage.

B0–B4 established the reproducible runtime, permanent quality gates, production artifact contract, one coherent authentication authority and a non-enumerating digest-based password-recovery lifecycle. The next executable block is **B5: API/domain truth and explicit authorization**.

Portfolio coordination: [`Enzopinotti/Enzopinotti#19`](https://github.com/Enzopinotti/Enzopinotti/issues/19)

## Author

Enzo Pinotti
