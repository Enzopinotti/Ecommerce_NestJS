# B7 — Permanent suites, Mongo integration and final CI

## Status

Closed after B6 on the `modernize/2026-final-test-ci` lane.

B7 replaces the last stock test scaffolding and debt-tolerant CI behavior with permanent product contracts. It does not add ecommerce scope; it proves the runtime that already exists.

## Starting point

B6 closed with:

- Node 24.20.0 / npm 11.19.0;
- Nest 12 + TypeScript 5.9.3;
- full-project typecheck green;
- production high audit green;
- 14/14 unit suites and 38/38 unit tests;
- 105 lint errors still tracked as debt;
- formatting still tracked as debt;
- B2–B5 runtime scripts green;
- a historical E2E file that still represented starter-era behavior rather than the maintained application.

## Test architecture

B7 separates three layers.

### Unit

`npm run test:unit`

- fast, local behavior tests;
- 14/14 suites;
- 38/38 tests;
- no Mongo service required.

### Integration

`npm run test:integration`

The integration suite uses the real `AppModule` providers with an ephemeral Mongo service and verifies service/persistence boundaries without HTTP:

- visible-only categories;
- visible-only product filtering and pagination;
- hidden-resource behavior;
- user password hashing against Mongo;
- password exclusion from ordinary user lookup.

Current floor: **1 suite / 3 tests**, all green.

### E2E

`npm run test:e2e`

The E2E suite creates the real Nest Express application without binding an external port and validates:

- `/` redirects to `/login`;
- login view and static CSS render;
- profile rejects unauthenticated access;
- registration does not expose token/password;
- login creates the HttpOnly/SameSite cookie;
- cookie session resolves identity;
- logout invalidates the browser session;
- recovery returns an indistinguishable response for known/unknown email;
- public category/product catalog exposes only visible records;
- invalid Mongo ObjectId returns 400;
- server-rendered product search excludes hidden resources.

Current floor: **1 suite / 5 tests**, all green.

The historical `Hello World!` E2E assertion was removed rather than kept as a misleading test.

## Testable bootstrap

`src/main.ts` now distinguishes application construction from process startup.

Importing `createApplication()` no longer starts a listening process as a side effect. `bootstrap()` still runs when the compiled main module is executed directly, so production behavior is preserved while tests can exercise the real middleware, validation, rendering and guards in-process.

## Controlled test configuration

`test/setup-test-env.ts` supplies only safe test defaults:

- test environment;
- local ephemeral Mongo URI;
- test-only JWT key;
- mail disabled;
- local test base URL.

CI requires no personal database, SMTP credential or application secret.

## Lint and formatting graduation

B7 deliberately closed the debt instead of keeping a ratchet forever.

A one-time mechanical cleanup ran Prettier and ESLint autofixes, then required full typecheck, build and unit tests before the formatting changes could be committed.

After that cleanup, four non-autofixable issues remained:

- two unused cart scaffold DTO parameters;
- two dead product-module imports.

Those were corrected explicitly without changing the ESLint rules.

Final permanent contract:

- `npm run lint`: **0 errors / 0 warnings**;
- `npm run format:check`: green.

The old lint-debt ratchet script was removed.

## Permanent CI

The final workflow has two jobs and runs on pull requests to `main`, pushes to `main`, and modernization branches.

### quality

1. exact checkout;
2. Node/npm identity verification;
3. `npm ci`;
4. hygiene;
5. deployable and full-project typecheck;
6. build;
7. lint;
8. format check;
9. unit tests;
10. clean-tree verification;
11. production dependency audit at high threshold.

### runtime-tests

Uses `mongo:7.0.43-jammy` and then executes:

1. B2 production build/runtime smoke;
2. B3 authentication regression;
3. B4 password-recovery regression;
4. B5 domain-truth regression;
5. Mongo integration suite;
6. HTTP/rendering E2E suite.

This keeps the security/runtime contracts accumulated during modernization while avoiding five separate Mongo jobs and repeated installs.

## Dependency automation

Dependabot is enabled weekly for:

- npm direct/transitive updates;
- GitHub Actions.

npm major updates stay manual because B6 demonstrated that major framework/tooling migrations require deliberate compatibility work. The open-PR limits keep the academic repository from becoming dependency-bot noise.

## No vanity coverage gate

B7 does not introduce an arbitrary line-coverage percentage. The maintained risk boundaries have explicit positive and negative tests instead: config, auth, recovery, catalog visibility, ObjectId validation and production smoke.

## Exit criteria

B7 is closed only when the final exact HEAD passes both permanent jobs.

B8 owns final documentation review, complete diff/scope review, PR review, exact-head merge, post-merge main verification and portfolio synchronization.
