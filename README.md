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
```

`npm run quality` requires hygiene, deployable-source typechecking and build to pass. It also ratchets known historical lint/unit debt so those areas may improve but may not regress. B0 began with 474 lint errors; B2 reduced that count to 383 and the ratchet was tightened to preserve the improvement.

`npm run test:b2:runtime` builds the real production artifact and validates fail-fast configuration, configurable port, global DTO validation, compiled Handlebars views and compiled static assets. In GitHub Actions it runs against an isolated MongoDB service and temporarily hides the source view/static directories so accidental runtime dependencies on `src/` cannot pass unnoticed.

The permanent GitHub Actions workflow also runs full-project typecheck, formatting and the production dependency audit as explicit debt inventories. Their known failures remain visible until dedicated modernization blocks repair them; a green workflow does not mean that historical test, formatting or supply-chain debt has been erased.

Modernization evidence:

- [`docs/modernization-2026/b0-baseline.md`](docs/modernization-2026/b0-baseline.md)
- [`docs/modernization-2026/b1-toolchain-quality.md`](docs/modernization-2026/b1-toolchain-quality.md)
- [`docs/modernization-2026/b2-config-runtime.md`](docs/modernization-2026/b2-config-runtime.md)

## Portfolio status

This repository is preserved as a **framework-specific backend learning artifact**. It is intentionally not being expanded into a new production ecommerce system just to make the repository look newer.

The active 2026 maintenance lane focuses on:

- dependency/runtime compatibility;
- configuration and secret hygiene;
- validating which tests still represent real behavior;
- tightening API/auth boundaries where useful;
- documenting historical versus maintained behavior;
- avoiding duplication with the already-modernized Meow Matrix full-stack ecommerce lineage.

Portfolio coordination: [`Enzopinotti/Enzopinotti#19`](https://github.com/Enzopinotti/Enzopinotti/issues/19)

## Author

Enzo Pinotti
