# B3 — Single authentication authority

Status: **closed** after exact-head verification.

## Starting point

B3 started from the verified B2 runtime baseline and was developed on `modernize/2026-auth-authority`.

The purpose of this block was deliberately narrow: make authentication understandable and testable before touching password-recovery storage, mail delivery, domain authorization or dependency majors.

## Problems confirmed before B3

The historical application had several competing authentication paths at the same time:

- two different `AuthService` implementations;
- JWT/auth registration in multiple modules;
- a Passport JWT guard plus a global Passport middleware;
- login writing an HttpOnly cookie while the JWT strategy extracted Bearer tokens only;
- strategy validation tied to password-oriented user validation;
- registration hashing before calling a persistence service that hashed again;
- JWT returned in JSON even though the browser credential was intended to be HttpOnly;
- auth errors broadly converted into invalid-credential responses;
- `/profile` depending on globally injected `req.user` rather than an explicit guard;
- logout reachable through a state-changing GET route;
- password-reset and session JWTs sharing the same secret and a previously indistinguishable payload shape.

## Decisions

### One authority

`AuthModule` is the only authentication authority. It owns the single `AuthService`, JWT strategy and JWT guard used by the application.

Duplicate auth implementations and redundant JWT wiring were removed instead of being kept as compatibility aliases.

### Cookie-only browser session

This server-rendered project now has one explicit session credential: the `access_token` HttpOnly cookie.

Bearer-only requests do not authenticate the browser session. This avoids maintaining two implicit authorities merely because both patterns existed in the historical code.

The session cookie is configured with:

- `httpOnly: true`;
- `sameSite: lax`;
- `path: /`;
- a one-hour lifetime matching the session JWT;
- `secure: true` in production.

### Explicit JWT purpose

Session JWTs include `purpose: "session"` and are rejected unless that purpose is present.

Password-reset JWTs, while still historical and due for replacement in B4, use `purpose: "password-reset"`. A valid reset JWT cannot be used as a browser session simply by placing it in the session cookie.

Pre-B3 JWTs without an explicit purpose require login again. That intentional compatibility break prevents ambiguous legacy tokens from becoming sessions under the new extractor.

### Identity by subject, never by password

`JwtStrategy.validate()` resolves the user from the token subject (`sub`). Password comparison is confined to login and is no longer part of session identity resolution.

### Registration and login are separate

Registration creates the user and returns a public user view, but it does not establish a browser session.

Login is the only operation that creates the session cookie. The password is hashed exactly once in the persistence path.

Neither registration nor login returns the JWT in JSON.

### Error semantics

The B3 auth boundary distinguishes expected client errors from infrastructure failures:

- invalid credentials: `401`;
- duplicate account/email: `409`;
- validation errors: normal global validation behavior;
- unexpected database/configuration failures are not rewritten as fake `401` responses.

### Explicit protection and logout mutation

`/profile` is protected with `JwtAuthGuard` instead of depending on a global middleware side effect.

Browser logout is now a POST mutation that clears the same hardened cookie and redirects to `/login`. JSON auth endpoints also clear the cookie through the same session-cookie contract.

## Tests added or converted

B3 replaced auth placeholder tests with behavior-oriented coverage for the new boundary.

The unit coverage verifies, among other things:

- registration delegates one plain password to the persistence hashing authority instead of pre-hashing it;
- duplicate registration is a conflict;
- incorrect credentials are unauthorized;
- unexpected service errors are not disguised as unauthorized;
- controller responses do not expose session tokens;
- profile rendering consumes an authenticated identity;
- browser logout clears the hardened session cookie and redirects.

The production runtime smoke in `scripts/b3/auth-runtime.mjs` runs the compiled application against a real MongoDB service and verifies:

- anonymous session request is `401`;
- registration creates a real Mongo user;
- persisted password is one verifiable bcrypt hash of the submitted password;
- duplicate registration is `409`;
- wrong password and unknown user are `401`;
- login establishes the hardened cookie;
- auth JSON responses contain no JWT/password/reset token;
- valid cookie resolves the same user;
- Bearer-only authentication is rejected;
- password-reset-purpose JWT is rejected as a session;
- legacy purpose-less JWT is rejected as a session;
- malformed cookie is rejected;
- `/profile` is inaccessible anonymously and renders with an authenticated session;
- GET `/logout` no longer performs the mutation;
- POST `/logout` clears the cookie and redirects;
- compatibility login route establishes the same canonical session;
- application output does not contain the test JWT secret, Mongo URI or issued session token.

## Exact-head evidence before documentation close

Run `35256195813` verified commit:

`1bb14c452cae1edd7ecf88bc65d8db0c9ba76392`

Environment:

- Node `v24.20.0`;
- npm `11.19.0`;
- MongoDB `mongo:7.0.43-jammy`.

All three blocking jobs completed successfully:

- `quality`: success;
- `b2-runtime`: success;
- `b3-auth-runtime`: success.

Artifacts:

| Artifact | ID | Digest |
| --- | ---: | --- |
| `static-quality-1bb14c452cae1edd7ecf88bc65d8db0c9ba76392` | `10513585714` | `sha256:0d09d5734548198fe0284ee75baf47a39a39f7e5713f5eee2076d0980899efb2` |
| `b2-runtime-1bb14c452cae1edd7ecf88bc65d8db0c9ba76392` | `10512651083` | `sha256:fca03ecf1ef79401009c6f4454cd245c91e43fc491d7fdc3a1d7323c68f42c11` |
| `b3-auth-1bb14c452cae1edd7ecf88bc65d8db0c9ba76392` | `10513421061` | `sha256:1f093fe9a8f19bbde698c53ac03dc13c060685ce541d0584082eec370251128b` |

The B3 runtime output ended with:

```text
B3 auth runtime contract passed.
authority=cookie-only jwt=single-registration identity=sub purpose=session
register=no-session login=200 invalid=401 duplicate=409 logout=post-only
responses=no-token persistence=single-bcrypt-hash reset-token=rejected profile=guarded
```

## Quality ratchets after B3

B3 materially reduced historical debt without running a repository-wide autofix:

- B0 lint baseline: 474 errors;
- B2 close: 382 errors;
- final B3 measurement: **182 errors / 0 warnings**;
- B3 unit ratchet: 12 suites total, 5 passing / 7 failing;
- B3 unit ratchet: 20 tests total, 13 passing / 7 failing.

The remaining seven failing suites are historical scaffold tests whose modules do not provide their model/config dependencies. They remain visible for the blocks that own those modules instead of being deleted to manufacture a green suite.

Known non-blocking debt also remains explicit:

- full-project typecheck still exposes the historical Supertest callable-import `TS2349` in `test/app.e2e-spec.ts`;
- formatting inventory still reports 20 files;
- production audit still reports 27 vulnerabilities (4 low, 5 moderate, 15 high, 3 critical).

B3 did not run `npm audit fix --force`, mass-format the repository or upgrade framework majors.

## Deliberately deferred

B3 did **not** claim to solve the following concerns:

- raw reset token persistence;
- account enumeration in recovery;
- reset-token digest/use-once lifecycle;
- recovery URL construction and mail error sanitization;
- product/user/cart authorization matrix;
- fake/scaffold CRUD;
- ObjectId/query DTO cleanup;
- framework/dependency audit debt;
- global TypeScript strictness.

Those concerns remain assigned to B4, B5 and B6 exactly as defined in the modernization issue.

## Exit criteria

B3 is considered closed only when the documentation commit itself also reproduces the same three gates and the tightened lint ratchet. The issue comment records that final exact-head run and its artifacts.

The next executable block is **B4 — credentials, recovery and mail security**.
