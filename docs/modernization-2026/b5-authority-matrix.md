# B5 — API/domain truth and authority matrix

Status: **active**.

Starting point: `40dae1e3b999a8998ca34b29f27bf5d6874f1aae` (verified B4 close).

B5 does not invent an administrator role, cart domain, payments or transactional ecommerce behavior. Its job is to make the maintained HTTP surface tell the truth about the project that actually exists.

## Authority matrix

| Surface | Maintained authority | B5 decision |
| --- | --- | --- |
| `POST /users/recoveryPass` | Public recovery request | Keep; B4 non-enumerating contract remains authoritative. |
| `POST /users/resetPass` | Possession of valid opaque recovery token | Keep; B4 digest/expiry/use-once contract remains authoritative. |
| `GET /users` | No legitimate global user-list authority exists | Remove from runtime. |
| `GET /users/:id` | No legitimate arbitrary-user read authority exists | Remove from runtime. |
| `PATCH /users/:id` | No legitimate arbitrary-user write authority exists | Remove from runtime. |
| `DELETE /users/:id` | No legitimate arbitrary-user delete authority exists | Remove from runtime. |
| `/profile` | Authenticated browser session | Keep under B3 `JwtAuthGuard`. |
| `GET /products` | Public server-rendered catalog | Keep; validate/bound page, limit, sort and query. |
| `GET /products/:id` | Public visible-product read | Keep; valid Mongo ObjectId required, hidden/missing resources return 404. |
| `POST/PATCH/DELETE /products...` | No maintained write authority exists | Remove from runtime rather than invent an admin role. |
| `GET /categories` | Public visible-category read | Keep; return visible categories only. |
| `GET /categories/:id` | Public visible-category read | Keep; valid Mongo ObjectId required. |
| `POST/PATCH/DELETE /categories...` | No maintained write authority exists | Remove from runtime. |
| `/carts...` | Historical Nest scaffold only | Remove the module from active runtime; routes must be 404. |

## Serialization rule

Credential fields are never part of a normal user projection. `password`, `resetPasswordTokenDigest` and `resetPasswordExpires` are schema-excluded by default. Authentication explicitly opts into `password` only for credential comparison, while recovery explicitly opts into the fields it needs.

## Domain truth rules

- MongoDB resources use ObjectId semantics; numeric coercion is not an identifier strategy.
- Public product/category reads never reveal hidden resources.
- Product pagination is bounded (`limit <= 50`) and sort keys are allow-listed.
- Search input is length-bounded and escaped before becoming a Mongo regular expression.
- The products view does not advertise admin, premium, cart or state-changing GET flows that the maintained backend does not implement.
- Historical scaffold source may remain in Git history, but inactive scaffolding is not presented as a live API.

## B5 exit target

B5 closes only after a production runtime gate demonstrates the matrix against real MongoDB while B2, B3 and B4 remain green. The four historical red Products/Categories unit suites must become real passing behavior tests rather than being deleted to manufacture green numbers.
