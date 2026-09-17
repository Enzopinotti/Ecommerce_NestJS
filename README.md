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

The verified B1 toolchain is Node `v24.20.0` and npm `11.19.0`. `.npmrc` uses `engine-strict=true`, so unsupported Node/npm versions fail instead of silently drifting.

Create a local environment file from the safe template and replace only local placeholders as needed:

```bash
cp .env.example .env
```

Do not commit real credentials, JWT secrets or database credentials.

Development mode:

```bash
npm run start:dev
```

Build:

```bash
npm run build
```

> The 2026 B0 baseline proved that compilation succeeds but the current historical `dist` output is not yet an autonomous deployable artifact because views/static assets still resolve through `src/`. B2 owns that runtime correction; do not interpret a successful build as production-readiness yet.

## Quality commands

B1 separates checks from commands that modify files:

```bash
npm run typecheck          # deployable source contract (tsconfig.build.json)
npm run typecheck:all      # includes historical tests; currently exposes known e2e debt
npm run format:check       # read-only
npm run format:write       # explicit mutation
npm run lint               # read-only
npm run lint:fix           # explicit mutation
npm run test:unit
npm run test:e2e
npm run quality            # blocking B1 local/CI contract
```

`npm run quality` is intentionally honest about the historical baseline. It requires hygiene, deployable-source typechecking and build to pass, and it uses ratchets for the known B0 lint/unit debt so those areas may improve but may not regress.

The permanent GitHub Actions workflow also runs full-project typecheck, formatting and the production dependency audit as explicit debt inventories. They remain visible even while their known B0 failures are not yet promoted to blocking gates.

Current B0 debt boundaries are documented under [`docs/modernization-2026/b0-baseline.md`](docs/modernization-2026/b0-baseline.md). B1 and later blocks progressively tighten these gates rather than hiding failures with autofix or broad dependency upgrades.

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
