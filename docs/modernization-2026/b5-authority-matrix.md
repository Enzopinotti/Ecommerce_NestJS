# B5 — API/domain truth and explicit authorization

Status: **closed**.

Starting point: `40dae1e3b999a8998ca34b29f27bf5d6874f1aae` (verified B4 close).

B5 deliberately avoided inventing an administrator role, transactional cart domain, payments or production ecommerce behavior. Its purpose was to make the maintained HTTP surface tell the truth about the academic project that actually exists.

## Authority matrix

| Surface | Maintained authority | Final B5 decision |
| --- | --- | --- |
| `POST /users/recoveryPass` | Public recovery request | Kept under the B4 non-enumerating contract. |
| `POST /users/resetPass` | Possession of a valid opaque recovery token | Kept under the B4 digest/expiry/use-once contract. |
| `GET /users` | No legitimate global user-list authority | Removed from runtime. |
| `GET /users/:id` | No legitimate arbitrary-user read authority | Removed from runtime. |
| `PATCH /users/:id` | No legitimate arbitrary-user write authority | Removed from runtime. |
| `DELETE /users/:id` | No legitimate arbitrary-user delete authority | Removed from runtime. |
| `/profile` | Authenticated browser session | Kept behind the B3 `JwtAuthGuard`. |
| `GET /products` | Public server-rendered catalog | Kept with validated/bounded page, limit, sort and query. |
| `GET /products/:id` | Public visible-product read | Kept; valid Mongo ObjectId required and hidden/missing resources return 404. |
| `POST/PATCH/DELETE /products...` | No maintained write authority | Removed instead of inventing an admin role. |
| `GET /categories` | Public visible-category read | Kept; only visible categories are returned. |
| `GET /categories/:id` | Public visible-category read | Kept with Mongo ObjectId semantics. |
| `POST/PATCH/DELETE /categories...` | No maintained write authority | Removed. |
| `/carts...` | Historical Nest scaffold only | Removed from active `AppModule`; routes resolve as 404. |

## Serialization and credential boundary

Credential fields are not part of ordinary user projections. `password`, `resetPasswordTokenDigest` and `resetPasswordExpires` are schema-excluded by default. Authentication opts into `password` only for credential comparison, while recovery opts into the reset state it explicitly needs.

This prevents an accidental generic user query from becoming a credential serialization boundary.

## Product and category truth

B5 replaced scaffold/string behavior with actual read contracts where the project has a real maintained use case.

- Mongo resources use ObjectId semantics; numeric coercion is not an identifier strategy.
- Invalid ObjectIds produce client errors instead of becoming fake numeric identifiers.
- Public reads never expose hidden products or categories.
- Product pagination is bounded to `limit <= 50`.
- Product sort keys are allow-listed.
- Search input is length-bounded and escaped before becoming a Mongo regular expression.
- Missing or hidden resources return 404 instead of placeholder strings.
- No unauthenticated write route remains for products/categories.

## Historical carts and UI truth

The carts source is preserved as historical learning material but is not registered as a maintained runtime module. B5 intentionally did not turn generated Nest scaffold strings into a fake commerce subsystem.

The server-rendered products page was aligned with the backend contract: obsolete admin, premium, cart and state-changing GET controls were removed rather than advertising features without a maintained authority behind them.

## Unit-suite repair

Before B5, four Products/Categories scaffold suites were still red because they instantiated services without their Mongoose model dependencies.

B5 replaced those placeholder setup failures with behavior-oriented controller/service tests and proper model mocks. The suites were not deleted or skipped.

Measured on candidate `d25212805d371b90b00539d760d82e9bff5717ee`:

- 14 / 14 suites passed;
- 38 / 38 tests passed;
- 0 failed suites;
- 0 failed tests;
- lint improved from the B4 ceiling of 141 errors to 122 errors / 0 warnings.

The closing quality contract converts the unit ratchet into a normal zero-failure gate while retaining minimum suite/test counts so later blocks cannot silently delete coverage.

## Production runtime verification

Run `35276520737` verified candidate commit:

`d25212805d371b90b00539d760d82e9bff5717ee`

All five jobs completed successfully:

- `quality`;
- `b2-runtime`;
- `b3-auth-runtime`;
- `b4-recovery-runtime`;
- `b5-domain-runtime`.

The B5 runtime uses an isolated MongoDB service and seeds both visible and hidden resources. It verifies the authority matrix at the compiled production boundary, including:

- removed global user CRUD is not exposed;
- removed product/category mutations are not exposed;
- historical cart routes are inactive;
- visible products/categories can be read;
- hidden/missing resources do not leak;
- invalid Mongo identifiers are rejected coherently;
- product `page`, `limit`, `sort` and search constraints are enforced;
- the production build remains compatible with all B2–B4 contracts.

## Candidate artifacts

| Artifact | ID | Digest |
| --- | ---: | --- |
| `static-quality-d25212805d371b90b00539d760d82e9bff5717ee` | `10521135133` | `sha256:a023b122e284a57436ebb428a680d8c52f58c6661329b6edc81c6e6c483a4ca5` |
| `b2-runtime-d25212805d371b90b00539d760d82e9bff5717ee` | `10520587830` | `sha256:5d85aa827d486867ab764fcaed8a30d085dbf4333e34354da4f605a0f053f5d3` |
| `b3-auth-d25212805d371b90b00539d760d82e9bff5717ee` | `10521335144` | `sha256:36e0e94aa7296e10866c8fde4bd9f34df8a207f595e2a572a8fcfed01f64398d` |
| `b4-recovery-d25212805d371b90b00539d760d82e9bff5717ee` | `10520558073` | `sha256:c06c748d232ebfef0ccab8dc600b9530cbdfdb513daa21e63b1ac97487f7284a` |
| `b5-domain-d25212805d371b90b00539d760d82e9bff5717ee` | `10520957691` | `sha256:075ce8fe349fd62fe1268ffdb4516537616f0c8bd3e6995dd337aed86cdf4ffe` |

The authoritative exact-head closing run for the documentation/ratchet commit is recorded in issue `#2`; that run must reproduce all five gates before the next block starts.

## Deliberately deferred

B5 does not claim to resolve:

- the historical Supertest import/typecheck failure in `test/app.e2e-spec.ts`;
- formatting debt;
- production dependency vulnerabilities;
- framework/dependency major upgrades;
- global TypeScript strictness;
- a new cart/checkout implementation;
- roles/admin/premium behavior;
- payments or production infrastructure.

Those remain assigned to B6/B7 rather than being hidden inside this domain block.

## Exit

B5 is closed when its closing commit reproduces `quality`, B2, B3, B4 and B5 on the exact same SHA. The next executable block is **B6 — TypeScript and 2026 dependency ratchet**.
