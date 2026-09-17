# B1 — toolchain reproducible + primer quality gate

Estado: **CERRADO**  
Carril: `modernize/2026-nest-quality`  
Baseline de entrada: B0 documentado en `docs/modernization-2026/b0-baseline.md`

## Objetivo

B1 convierte el diagnóstico de B0 en un piso de ingeniería reproducible para el resto de la modernización, sin cambiar todavía comportamiento de negocio, autenticación, configuración runtime ni dominio.

El objetivo no es hacer que toda la deuda histórica “parezca verde”. El objetivo es que, desde este bloque, el repositorio:

- declare explícitamente qué Node/npm usa;
- instale desde el lockfile de forma reproducible;
- separe checks read-only de comandos mutantes;
- disponga de un `quality` local reproducible;
- ejecute ese mismo contrato en GitHub Actions;
- impida regresiones sobre la deuda B0 mediante ratchets;
- siga mostrando de forma explícita la deuda que todavía no corresponde reparar.

## Autoridad de verificación

La corrida autoritativa de implementación B1 es:

- commit: `014626136a0b2f1de2d6a2836a45a2c42f73bd61`;
- workflow: `Quality`;
- run: `35243241947`;
- resultado global: **success**;
- Node: `v24.20.0`;
- npm: `11.19.0`;
- artifact: `b1-quality-014626136a0b2f1de2d6a2836a45a2c42f73bd61`;
- artifact ID: `10506880527`;
- digest: `sha256:6805df42e020acdad7f88b3a9cee832144b3463350347d4cbcfe0c48c0201842`;
- retención del artifact: 30 días.

El workflow diferencia entre el **gate bloqueante** y los **inventarios de deuda conocidos**. Por lo tanto, el `success` global significa que el contrato B1 no regresó; no significa que lint, tests históricos, formato o supply chain ya estén saneados.

## 1. Runtime y package manager declarados

El repositorio ahora fija el toolchain verificado en B0:

- `.nvmrc` → `v24.20.0`;
- `package.json#engines.node` → `>=24.20.0 <25`;
- `package.json#engines.npm` → `>=11.19.0 <12`;
- `package.json#packageManager` → `npm@11.19.0`;
- `.npmrc` → `engine-strict=true`.

La intención es que una versión incompatible falle explícitamente en vez de producir drift silencioso entre máquinas y CI.

Se conserva **npm** y el `package-lock.json` existente. No se cambió de package manager ni se regeneró el árbol de dependencias por estética. `npm ci` sigue pasando sobre el lock histórico en Node 24.

## 2. Scripts read-only vs mutantes

`package.json` separa ahora los contratos que verifican estado de aquellos que escriben archivos.

### Read-only

- `npm run typecheck` → TypeScript deployable (`tsconfig.build.json`), sin emitir archivos;
- `npm run typecheck:all` → TypeScript completo, incluyendo deuda histórica de tests;
- `npm run format:check`;
- `npm run lint`;
- `npm run test:unit`;
- `npm run test:e2e`;
- `npm run quality`.

### Mutantes explícitos

- `npm run format:write`;
- `npm run lint:fix`.

El alias histórico `format` apunta deliberadamente a `format:write`; por lo tanto la mutación queda explícita al inspeccionar scripts y el gate nunca la invoca.

El script `quality` termina además con `git diff --exit-code`, de modo que un check que modifique accidentalmente un archivo trackeado convierte el gate en rojo.

## 3. Contrato de higiene B1

Se agregó `scripts/quality/hygiene.mjs`.

El script verifica, sin modificar archivos:

- `private=true`;
- runtime/npm declarados y consistentes;
- `.nvmrc` y `.npmrc`;
- ausencia de `--fix`/`--write` en los scripts read-only críticos;
- presencia de las variables esperadas en `.env.example`;
- reglas esenciales de `.gitignore`.

En la corrida autoritativa: **PASS**.

## 4. `.env.example` y secretos

Se agregó una plantilla segura que enumera los nombres que el proyecto histórico ya necesita o necesitará formalizar en B2:

- `NODE_ENV`;
- `PORT`;
- `APP_BASE_URL`;
- `MONGODB_URI`;
- `JWT_KEY`;
- `SERVICE_MAIL`;
- `SERVICE_MAIL_PORT`;
- `EMAIL_USER`;
- `EMAIL_PASSWORD`.

No contiene credenciales reales. `JWT_KEY` usa únicamente un placeholder local explícito y las credenciales mail quedan vacías.

B1 **no afirma** que estas variables ya estén validadas por la aplicación. Esa responsabilidad pertenece a B2.

## 5. `.gitignore`

Se endureció la higiene para ignorar, entre otros:

- `dist`, `build`, `node_modules`;
- coverage y outputs de quality;
- `.eslintcache` y `*.tsbuildinfo`;
- `.env` y variantes, manteniendo `!.env.example`;
- temporales/caches;
- logs y PID/runtime artifacts.

## 6. Ratchet de ESLint

B0 midió **474 errores, 0 warnings**, con 453 errores potencialmente auto-fixables.

B1 no ejecuta un autofix masivo. Se agregó `scripts/quality/lint-baseline.mjs`, que ejecuta ESLint en JSON/read-only y permite únicamente mantener o mejorar la línea base:

- errores máximos: `474`;
- warnings máximos: `0`.

Resultado autoritativo B1:

- errores: `474`;
- warnings: `0`;
- fixable errors: `453`;
- ratchet: **PASS**.

Esto significa que el error 475 bloquea CI desde B1. Cuando bloques posteriores reduzcan la deuda, el baseline podrá endurecerse.

## 7. Ratchet de unit tests

La suite histórica de B0 no era una red de seguridad utilizable: 10 de 12 suites fallaban.

Se agregó `scripts/quality/unit-baseline.mjs`, que ejecuta Jest, escribe el resultado JSON únicamente en el directorio temporal del SO y verifica que la situación no empeore.

Límites B0 preservados:

- failed suites máximo: `10`;
- passed suites mínimo: `2`;
- total suites mínimo: `12`;
- passed tests mínimo: `2`;
- total tests mínimo: `7`.

Resultado autoritativo B1:

- failed suites: `10`;
- passed suites: `2`;
- suites totales: `12`;
- failed tests: `5`;
- passed tests: `2`;
- tests totales: `7`;
- ratchet: **PASS**.

El gate no afirma que Jest esté sano. Afirma algo verificable: **la deuda histórica no empeoró**.

## 8. Typecheck dividido por frontera real

El primer intento del gate permanente expuso una distinción importante.

Run inicial: `35243016714`.

El `typecheck` original utilizaba `tsconfig.json`, por lo que incluía `test/app.e2e-spec.ts` y volvió a encontrar el error B0 ya conocido:

`TS2349: This expression is not callable.`

La causa es el import histórico de Supertest en el harness e2e. No es un fallo nuevo del source deployable.

La corrección de B1 fue separar contratos, no esconder el hallazgo:

- `typecheck` usa `tsconfig.build.json`, la misma frontera de código que Nest considera deployable;
- `typecheck:all` sigue incluyendo tests y se ejecuta como inventario explícito de deuda.

En la corrida autoritativa:

- deployable typecheck: **PASS**;
- full-project typecheck: **FAIL conocido** por el mismo TS2349 del e2e.

La deuda permanece visible en cada corrida hasta que el bloque correspondiente repare el harness.

## 9. Quality gate permanente

Se agregó `.github/workflows/quality.yml`.

### Triggers

- pull requests hacia `main`;
- pushes a `main`;
- pushes al carril `modernize/2026-nest-quality` mientras se desarrolla;
- `workflow_dispatch`.

### Hardening

- `permissions: contents: read`;
- timeout de 15 minutos;
- concurrency con cancelación del run anterior de la misma referencia;
- checkout del commit exacto;
- Node leído desde `.nvmrc`;
- verificación explícita de Node y npm antes de instalar;
- `npm ci`;
- actions fijadas por SHA.

Durante B1 se detectó además que los SHAs heredados de B0 correspondían a generaciones de actions que GitHub ya advertía por runtime Node 20. Se actualizaron a releases vigentes y se mantuvo el pin inmutable por SHA:

- `actions/checkout` v7.0.1 → `3d3c42e5aac5ba805825da76410c181273ba90b1`;
- `actions/setup-node` v7.0.0 → `820762786026740c76f36085b0efc47a31fe5020`;
- `actions/upload-artifact` v7.0.1 → `043fb46d1a93c77aae656e7c1c64a875d1fc6a0a`.

La corrida autoritativa ya no muestra el warning heredado de actions ejecutadas forzosamente sobre Node 24.

## 10. Qué bloquea CI desde B1

El paso `Blocking B1 quality contract` exige que pasen todos estos puntos:

1. hygiene contract;
2. typecheck del source deployable;
3. build;
4. lint sin superar el baseline B0;
5. unit tests sin empeorar el baseline B0;
6. cero cambios en archivos trackeados producidos por `quality`.

En `35243241947`: **todos PASS**.

## 11. Deuda visible pero todavía no bloqueante

El workflow ejecuta siempre tres inventarios adicionales con `continue-on-error`. El step summary conserva su `outcome` real, por lo que la UI global verde no los disfraza.

### Full-project typecheck

**FAIL conocido**.

- `test/app.e2e-spec.ts(19,12)`;
- Supertest namespace import invocado como función;
- mismo TS2349 registrado en B0.

### Formato

**FAIL conocido**.

Prettier reporta **36 archivos** con diferencias de estilo. B1 no ejecuta `prettier --write` masivamente porque mezclaría cientos de cambios cosméticos con los bloques funcionales siguientes.

### Production audit

**FAIL conocido**.

`npm audit --omit=dev --audit-level=high` continúa reportando **27 vulnerabilidades**:

- 4 low;
- 5 moderate;
- 15 high;
- 3 critical.

B1 no ejecuta `npm audit fix --force`; varias recomendaciones implican majors y cambios de comportamiento. El ratchet de dependencias se abordará después de contar con contratos de config/auth/tests más confiables.

## 12. README y onboarding local

El README ya documenta:

- `nvm use`;
- versiones verificadas;
- `npm ci` en lugar de una instalación flotante;
- creación de `.env` desde `.env.example`;
- diferencia entre checks read-only y comandos mutantes;
- semántica del ratchet;
- advertencia explícita de que `build` todavía no equivale a artifact productivo autónomo.

Por lo tanto, una persona que clone el repo ya no necesita adivinar runtime, package manager ni qué significa un quality verde durante esta modernización.

## 13. Workflow B0 retirado

`.github/workflows/b0-baseline.yml` fue eliminado del branch una vez congelada su evidencia.

B0 sigue preservado en:

- historial Git;
- `docs/modernization-2026/b0-baseline.md`;
- run/artifact autoritativos ya registrados.

Esto evita ejecutar un diagnóstico histórico costoso en cada push de los bloques nuevos.

## 14. Qué B1 NO corrige

B1 no modifica comportamiento de aplicación. En particular deja para los bloques asignados:

- configuración fail-fast;
- `PORT` hardcodeado;
- build que depende de `src/views` / `src/public`;
- Handlebars prototype access;
- ValidationPipe global;
- doble autoridad de auth/JWT;
- doble hash y fronteras de sesión;
- recovery/mail hardening;
- CRUD/IDs/DTO/autorización;
- reparación real de unit/e2e;
- upgrades de dependencias y eliminación de advisories.

## 15. Gate de salida B1

B1 queda cerrado porque hay evidencia de que:

- runtime y npm están declarados y verificados;
- `npm ci` reproduce el lock existente;
- `npm run quality` es read-only respecto del árbol trackeado;
- CI ejecuta el mismo contrato con permisos mínimos;
- el gate no necesita secretos reales;
- lint y unit tests no pueden empeorar respecto de B0;
- el source deployable typecheckea y compila;
- las deudas que todavía no corresponde corregir siguen apareciendo explícitamente en cada corrida.

## Próximo bloque — B2

B2 puede ahora cambiar bootstrap/config con una red de seguridad mínima y reproducible.

Su alcance es:

- una única autoridad de `ConfigModule`;
- esquema de configuración tipado y fail-fast;
- `NODE_ENV`, `PORT`, `MONGODB_URI`, `JWT_KEY`, `APP_BASE_URL` y mail bajo contrato explícito;
- startup inválido debe fallar antes de escuchar;
- `PORT` configurable;
- `ValidationPipe` global;
- Handlebars sin prototype escape;
- views/static empaquetados correctamente;
- `npm run build && npm run start:prod` demostrablemente autónomo respecto de `src/`;
- tests específicos para esas fronteras.

B2 debe mantener verde el quality B1 mientras endurece esas fronteras.
