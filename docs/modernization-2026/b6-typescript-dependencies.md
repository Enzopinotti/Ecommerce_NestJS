# B6 — TypeScript and dependency ratchet

## Status

Closed on the `modernize/2026-ts-dependencies` lane after B5.

B6 modernizes the TypeScript/dependency baseline without turning the historical academic backend into a new product. The block deliberately used measured dependency groups and cumulative runtime contracts instead of a blind major-version update.

## Starting point

B5 closed with:

- Node `24.20.0` / npm `11.19.0`;
- 14/14 unit suites and 38/38 tests green;
- lint ratchet at 122 errors;
- full-project typecheck still treated as debt;
- production dependency audit still treated as debt;
- Nest 10-era runtime dependencies.

The B6 inventory first measured actual `npm outdated`, audit and TypeScript strictness behavior before changing versions.

## TypeScript contract

B6 promoted the following compiler guarantees:

- `strictNullChecks=true`;
- `noImplicitAny=true`;
- `forceConsistentCasingInFileNames=true`;
- `npm run typecheck:all` is green and permanent.

The E2E Supertest import was corrected instead of excluding the test tree from the full-project compiler contract. Missing external declarations were added explicitly, and the mail transport boundary was typed structurally instead of using `any`.

The maintained compiler is **TypeScript 5.9.3**. A TypeScript 6 big-bang was evaluated and rejected because combining it with framework/tooling majors broke several independent gates at once. B6 keeps stronger type safety without adopting a major solely for novelty.

## Runtime dependency groups

The first compatible runtime group updated security/maintenance versions while keeping the Nest runtime on its existing major. It validated:

- Mongoose 8.24.4;
- bcrypt 6;
- Nodemailer 10;
- current compatible Nest 10 patches;
- class-validator/cookie-parser/jsonwebtoken and related maintenance versions.

A subsequent semver-safe `npm audit fix` reduced the production audit further without `--force`.

## Why Nest 12 was accepted

After compatible fixes, the remaining production high findings were attributable to the Nest runtime/platform stack. B6 therefore isolated the Nest major rather than combining it with TypeScript, Jest and every development tool.

The accepted runtime baseline is:

- `@nestjs/common/core/platform-express` 12.0.3;
- `@nestjs/config` 12.0.0;
- `@nestjs/jwt` 12.0.2;
- `@nestjs/mapped-types` / mongoose / passport 12-compatible packages;
- Mongoose 8.24.4;
- Nodemailer 10.0.10;
- bcrypt 6.0.0.

The Nest 12 packages publish ESM entrypoints while this project remains a CommonJS application with Jest 29. B6 keeps the application runtime CommonJS and bridges only Nest's JavaScript packages in tests using Babel 7 + `babel-jest`. No production module-system rewrite was required.

The historical Nest CLI/schematics remain on their verified 10.x line because their 12.x line requires TypeScript 6. They are development tooling, and the current CLI continues to build the verified Nest 12 application. This is an explicit compatibility decision, not an accidental partial upgrade.

## Audit policy

B6 never used `npm audit fix --force` and never used `--legacy-peer-deps`.

The final production contract is:

```bash
npm run audit:prod
```

which executes `npm audit --omit=dev --audit-level=high` and is blocking in permanent CI.

The validated Nest 12 migration returned **0 production vulnerabilities at the high audit threshold**. Development-tool audit findings are not represented as production exposure; future tooling upgrades can remove them when they can do so without breaking the verified application contracts.

Two transitive development-tool versions are pinned with npm `overrides` to avoid known vulnerable ranges while retaining the compatible CLI line.

## 2026 tooling baseline

The final compatible tooling group validated and pinned:

- TypeScript 5.9.3;
- Jest 29.7.0;
- ts-jest 29.4.12;
- ESLint 8.57.1;
- @typescript-eslint 8.70.0;
- Prettier 3.9.8;
- ts-loader 9.6.2;
- ts-node 10.9.2;
- Babel 7 bridge for Nest 12 test imports.

Every tooling candidate was required to reinstall from its generated lockfile before validation.

## Final ratchets

B6 closed with:

- full-project typecheck green;
- production high audit green;
- lint **105 errors / 0 warnings**, down from 122 at B5 and 474 at B0;
- 14/14 unit suites green;
- 38/38 unit tests green;
- B2 configuration/runtime contract green;
- B3 authentication contract green;
- B4 recovery contract green;
- B5 domain-truth contract green.

Formatting remains visible debt and is not claimed as fixed in B6.

## Rejected approaches

B6 explicitly rejected:

- blind mass dependency upgrade;
- `npm audit fix --force`;
- `--legacy-peer-deps`;
- TypeScript 6 + Nest 12 + Jest/tooling big-bang;
- weakening or deleting tests to accept a framework major;
- rewriting the application to ESM only to satisfy the test harness;
- unexplained `any` casts to make stricter TypeScript pass.

## Next block

B7 owns the permanent test architecture: unit/integration/e2e separation, real Mongo integration/e2e in CI, replacement of historical E2E expectations with current contracts, and consolidation of the final PR/main CI gate.
