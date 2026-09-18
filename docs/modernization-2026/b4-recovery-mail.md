# B4 — Password recovery and mail security

Status: **closed pending final documentation-head reproduction**.

## Starting point

B4 started from the verified B3 close:

`8b2ddfd4bc142c4bb0700567663d84d0e2e336c6`

and was developed on `modernize/2026-recovery-mail`.

The block stayed deliberately narrow: secure the credential-recovery lifecycle and its mail/logging boundary without mixing in product/category authorization, ecommerce-domain expansion or dependency-major upgrades.

## Problems confirmed before B4

The historical recovery implementation had several security and truthfulness problems:

- a missing email returned `404`, exposing whether an account existed;
- password recovery used a signed JWT as a reset token even though reset and session credentials should be separate authorities;
- the raw reset token was persisted in MongoDB;
- reset lookup queried the raw token directly;
- the reset link lifecycle was not an atomic use-once operation;
- the reset page queried the token before the user submitted a new password;
- recovery JavaScript explicitly told the browser when an email did not exist;
- reset/recovery browser scripts logged sensitive request objects and responses;
- request logging printed the full URL, which later proved capable of leaking a raw reset token embedded in the path.

Mail configuration itself had already been improved during B2: transport construction is typed, mail settings are validated when mail is enabled, and delivery failures surface a generic sanitized application error.

## Decisions

### Opaque token, digest at rest

Recovery now generates a 32-byte cryptographically random token and encodes it as base64url.

The raw token exists only long enough to build the recovery link. MongoDB stores only:

- `resetPasswordTokenDigest`: SHA-256 of the raw token;
- `resetPasswordExpires`: the expiry timestamp.

The historical raw `resetPasswordToken` field is no longer part of the maintained recovery contract.

### Uniform public recovery response

`POST /users/recoveryPass` returns the same accepted response whether the submitted email exists or not.

A missing account does not produce a distinct status/body, and the browser no longer offers an account-existence branch. This removes the historical enumeration signal at the HTTP boundary.

### Delivery failure does not leave a live orphan token

If a known account receives a new digest but mail delivery fails, the just-created digest/expiry is cleared before the request finishes.

The client still receives the same public recovery response. Internal logging records only a generic delivery failure, not an address, token, password, transport secret or provider payload.

### Configured recovery URL

Recovery links are built from validated `APP_BASE_URL`; there is no hard-coded localhost authority in the maintained recovery flow.

### Expiry and atomic single use

Reset consumption is a single conditional MongoDB update keyed by:

- user id;
- token digest;
- `resetPasswordExpires > now`.

That update writes the new bcrypt password and unsets digest/expiry atomically. Once one caller consumes the token, a later or concurrent caller cannot reuse the same recovery authority.

Expired tokens are rejected and their stale digest/expiry are cleared.

### Password policy retained only with tests

The historical requirement that the new password must differ from the previous password remains, because B4 now verifies it explicitly.

The maintained reset path also verifies the existing password format policy and persists the accepted password as a bcrypt hash.

### Reset GET is presentation, not identity proof

`GET /resetPassword/:token` renders the form but does not query an account or consume/validate the token. Validation happens only when the reset mutation is submitted.

### Sensitive request URL redaction

The first B4 runtime gate found a real leak: `InfoMiddleware` logged `req.url`, so the raw token in `/resetPassword/:token` appeared in application output.

The gate was intentionally left unchanged. The application was fixed instead.

Request logging now redacts:

- the reset token path segment;
- `token` query parameters;
- `access_token` query parameters;
- common reset-token query aliases.

A dedicated unit suite locks this redaction behavior, including normal URLs and malformed input.

## Tests converted or added

B4 repaired the previously non-functional scaffold tests that belong to this block:

- `UsersController` now uses explicit collaborators;
- `UsersService` uses a model mock;
- `MailService` receives explicit configuration and verifies sanitized failure behavior;
- `PasswordRecoveryService` has behavior-oriented unit coverage;
- `InfoMiddleware` has a focused sensitive-URL redaction suite.

The remaining red unit suites are only Products/Categories scaffold tests, which are intentionally owned by B5.

## Production recovery runtime gate

`scripts/b4/recovery-runtime.mjs` builds and starts the real compiled application against an isolated MongoDB service.

It verifies:

- known and unknown emails both receive `202` with the same public JSON body;
- undeliverable mail does not leave a reset digest/expiry live;
- no raw reset token is stored in MongoDB;
- persisted reset authority is a SHA-256 digest, not the raw token;
- opening the reset form does not consume the token;
- same-as-old password is rejected;
- weak password is rejected;
- valid reset persists a bcrypt hash of the new password;
- successful reset clears digest and expiry;
- token reuse is rejected;
- fake token is rejected;
- expired token is rejected and stale recovery state is cleared;
- raw current/expired tokens do not appear in application logs;
- the CI JWT secret and Mongo URI do not appear in application logs.

## Security regression discovered by the gate

The first permanent B4 gate was added at:

`bb6c3ba0aedb20d53aaf7d0299c56279b6e20100`

Run `35272942615` correctly failed only `b4-recovery-runtime`: the raw token appeared in logs through `InfoMiddleware`'s full request URL logging.

That was fixed in:

`ebfe0214ef7816818c0d64c33946206d6ca9c8b2`

without weakening the runtime assertion.

The focused logger regression suite was then added in:

`165a14942ec807fb93b30006ff667e3abd6c809f`

## Verified candidate before documentation close

Run `35274868374` verified:

`165a14942ec807fb93b30006ff667e3abd6c809f`

Environment:

- Node `v24.20.0`;
- npm `11.19.0`;
- MongoDB `mongo:7.0.43-jammy`.

All four blocking jobs completed successfully:

- `quality`: success;
- `b2-runtime`: success;
- `b3-auth-runtime`: success;
- `b4-recovery-runtime`: success.

Artifacts:

| Artifact | ID | Digest |
| --- | ---: | --- |
| `static-quality-165a14942ec807fb93b30006ff667e3abd6c809f` | `10520156685` | `sha256:6403bbe4aeffe206ce81d39cc7d02a582006c8197e2f3d31230d7563ee24aa4a` |
| `b2-runtime-165a14942ec807fb93b30006ff667e3abd6c809f` | `10520086956` | `sha256:e86d49a2ccdd9bd281ca8931a877b2e8495c99ecebfff360e386c1c59f8fc852` |
| `b3-auth-165a14942ec807fb93b30006ff667e3abd6c809f` | `10520740488` | `sha256:c04e6177f3b2969b1c0f2099cb401e718e894f547d10b423c6229dfb782c29c5` |
| `b4-recovery-165a14942ec807fb93b30006ff667e3abd6c809f` | `10520376077` | `sha256:3d819c2a75dad3f12624d86ccd89390ec1f7f82cfad2dc17b937d8ae11009a4f` |

The B4 runtime output ends with the maintained contract summary:

```text
B4 password recovery runtime contract passed.
public-response=uniform token=opaque digest=sha256-at-rest ttl=1h
reset=single-use expiry=checked password=bcrypt mail-failure=non-enumerating
raw-token=absent-from-db-and-logs reset-view=no-account-lookup
```

## Quality ratchets after B4

B4 reduced historical debt again without mass-formatting or hiding unrelated failures:

- B0 lint baseline: 474 errors;
- B2 close: 382 errors;
- B3 close: 182 errors;
- B4 close candidate: **141 errors / 0 warnings**;
- B4 unit ratchet: 14 suites total, **10 passing / 4 failing**;
- B4 unit ratchet: 33 tests total, **29 passing / 4 failing**.

The four remaining failures are the historical Products/Categories controller/service scaffold suites. They stay visible because B5 owns those domain surfaces.

Known non-blocking debt remains explicit:

- full-project typecheck still exposes the historical Supertest callable-import `TS2349` in `test/app.e2e-spec.ts`;
- formatting inventory still reports 21 files;
- production audit still reports 27 vulnerabilities (4 low, 5 moderate, 15 high, 3 critical).

No `npm audit fix --force`, framework-major jump or repository-wide format rewrite was performed in B4.

## Deliberately deferred

B4 did **not** invent or expand ecommerce-domain functionality. It deliberately leaves the following to later blocks:

- endpoint-to-authority matrix for users/products/categories/carts;
- unsafe user serialization and unsupported user administration operations;
- ObjectId and query/DTO validation;
- product/category placeholder CRUD truthfulness;
- cart scaffold truthfulness;
- Products/Categories scaffold-test repair;
- historical e2e harness repair;
- dependency/advisory remediation and major-version decisions;
- broader TypeScript strictness.

## Exit criteria

B4 is closed only when this documentation/ratchet commit reproduces all four blocking jobs on its own exact HEAD. The modernization issue records that final exact-head run and artifacts.

The next executable block is **B5 — API/domain truth and explicit authorization**.
