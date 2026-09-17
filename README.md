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

## Local setup

Install dependencies:

```bash
npm install
```

Create the environment configuration required by the application before starting it. Do not commit real credentials or database secrets.

Development mode:

```bash
npm run start:dev
```

Production build:

```bash
npm run build
npm run start:prod
```

## Quality commands

```bash
npm run lint
npm run test
npm run test:e2e
npm run test:cov
```

## Portfolio status

This repository is preserved as a **framework-specific backend learning artifact**. It is intentionally not being expanded into a new production ecommerce system just to make the repository look newer.

A future dedicated maintenance lane should focus on:

- dependency/runtime compatibility;
- configuration and secret hygiene;
- validating which tests still represent real behavior;
- tightening API/auth boundaries where useful;
- documenting historical versus maintained behavior;
- avoiding duplication with the already-modernized Meow Matrix full-stack ecommerce lineage.

Portfolio coordination: [`Enzopinotti/Enzopinotti#19`](https://github.com/Enzopinotti/Enzopinotti/issues/19)

## Author

Enzo Pinotti
