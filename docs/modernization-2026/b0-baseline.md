# B0 — baseline real 2024 sobre runtime 2026

Estado: **CERRADO como diagnóstico**  
Carril: `modernize/2026-nest-quality`  
Baseline histórico de implementación: `e48266d1111af7dbb6d0255ebea9b77620da1695`  
Autoridad inmediatamente anterior al diagnóstico: `d3313889bf6a774e5cddf2b34685d789c9eecf00`

## Propósito

B0 existe para medir el backend tal como estaba antes de modernizar su comportamiento. No corrige auth, configuración, dominio, tests ni dependencias. Los únicos commits agregados durante este bloque son infraestructura diagnóstica y esta evidencia.

La corrida autoritativa de B0 fue ejecutada en GitHub Actions sobre el commit diagnóstico:

- commit: `9c28c0db1385269644b9302a544551ea82767480`;
- workflow run: `35241615507`;
- artifact: `b0-baseline-9c28c0db1385269644b9302a544551ea82767480`;
- artifact ID: `10505936352`;
- artifact SHA-256 de GitHub: `sha256:f82f575d6653dc3aa176d6358c4ec0da12c5ab9212f56a98faf3a5772e28c05c`;
- retención: 30 días.

El workflow continúa deliberadamente después de fallos diagnósticos. Por eso el color global de la corrida **no representa** un baseline limpio: la autoridad es el resultado individual de cada comando y los logs/artifacts capturados.

## Entorno reproducido

- runner: Ubuntu 24.04;
- Node.js: `v24.20.0`;
- npm: `11.19.0`;
- MongoDB de prueba: `mongo:7` (`7.0.43` en la corrida);
- instalación: `npm ci` desde el `package-lock.json` histórico;
- actions usadas por el diagnóstico, fijadas por SHA.

Mongo quedó accesible antes de iniciar los checks de aplicación.

## Resultado ejecutivo

| Check | Resultado B0 | Interpretación |
| --- | --- | --- |
| Mongo TCP | PASS | servicio real disponible para la corrida |
| `npm ci` | PASS | lock histórico instalable en Node 24 |
| `npm audit` | FAIL | 56 vulnerabilidades reportadas |
| `npm audit --omit=dev --audit-level=high` | FAIL | 27 vulnerabilidades en árbol de producción |
| `npm outdated` | EXIT 1 | hay paquetes desactualizados; no es un crash del comando |
| `npm run build` | PASS | TypeScript/Nest compila bajo Node 24 |
| ESLint read-only | FAIL | 474 errores; el árbol no pasa un gate no-mutante |
| unit tests | FAIL | 10/12 suites fallan; la suite no constituye red de seguridad válida |
| e2e | FAIL | falla en compilación antes de ejecutar tests |
| `start:prod` con `src/` presente | PASS | `/login` y CSS devuelven 200 |
| `PORT=3123` | FAIL contract | escucha en 3000; ignora `PORT` |
| startup sin `JWT_KEY` | NO LISTEN | aborta incidentalmente dentro de `passport-jwt` |
| runtime aislado sólo desde build | FAIL | `/login` 500 y CSS 404 sin `src/` |

## 1. Instalación y compatibilidad Node 24

`npm ci` completa correctamente con el lockfile existente. Esto descarta que la modernización necesite comenzar reemplazando npm, el lockfile o el runtime únicamente para poder instalar.

Warnings relevantes observados:

- `@types/winston@2.4.4` está deprecado porque Winston publica sus propios tipos;
- npm emite advertencias de install scripts para dependencias como `@nestjs/core@10.3.3` y `bcrypt@5.1.1`.

La conclusión de B0 es conservar npm y el lockfile como punto de partida. Cualquier actualización posterior debe ser un cambio medido, no una reconstrucción del proyecto.

## 2. Supply chain / dependencias

### Audit completo

Resultado observado: **56 vulnerabilidades**.

- 9 low;
- 15 moderate;
- 28 high;
- 4 critical.

### Árbol de producción

`npm audit --omit=dev --audit-level=high` reportó **27 vulnerabilidades**:

- 4 low;
- 5 moderate;
- 15 high;
- 3 critical.

Entre las cadenas runtime señaladas aparecen dependencias relacionadas con Nest, Express/body-parser, cookie/cookie-parser, Handlebars, JWT/JWS, Mongoose, Multer, Nodemailer, `path-to-regexp` y `validator`.

B0 **no ejecuta** `npm audit fix --force`. El propio inventario muestra que algunos fixes propuestos saltan majors importantes; aplicar eso antes de disponer de tests confiables mezclaría mantenimiento, migración y cambios de comportamiento.

### Outdated

`npm outdated` devuelve código 1 porque existen versiones más recientes. El comando funcionó y su salida se conserva como inventario.

Hay actualizaciones posibles dentro de las majors actuales —por ejemplo Nest 10.x, Mongoose 8.x, Nodemailer 6.x y TypeScript 5.x— además de majors posteriores. B6 decidirá el ratchet exacto después de que configuración, auth y tests tengan contratos verificables.

## 3. Build y runtime

### Build

`npm run build` pasa en Node 24.

Eso demuestra **compilabilidad**, no empaquetado correcto.

### Runtime con source tree presente

Ejecutando `node dist/main` desde el checkout completo:

- `/login` → HTTP 200;
- `/css/login.css` → HTTP 200.

### Runtime aislado

Después del build se ocultó temporalmente `src/` y se lanzó exactamente `node dist/main`.

Resultado:

- el proceso llega a iniciar;
- `/login` → HTTP 500;
- `/css/login.css` → HTTP 404;
- log: `Failed to lookup view "login" in views directory .../src/views`.

Por lo tanto el artifact compilado **no es autónomo**. `main.ts` resuelve vistas y estáticos desde el árbol fuente y `nest-cli.json` no los empaqueta en `dist`.

B2 debe corregir este contrato y demostrar un production-local runtime que funcione sin depender accidentalmente de `src/`.

## 4. Configuración de puerto

La prueba arrancó el backend con `PORT=3123`.

Resultado:

- `3123` no respondió;
- `3000` sí respondió.

El runtime ignora `PORT`; el `listen(3000)` actual sigue siendo la autoridad.

B2 debe volver `PORT` configurable y testearlo.

## 5. `JWT_KEY`: falla cerrada accidental, no validación diseñada

Se eliminó `JWT_KEY` del entorno y se intentó iniciar el build.

La aplicación **no llegó a escuchar**, pero el motivo no es un esquema de configuración fail-fast. La excepción real es:

`TypeError: JwtStrategy requires a secret or key`

originada desde `passport-jwt` mientras Nest instancia `JwtStrategy`.

Además, el log muestra inicialización repetida de `ConfigModule` y `JwtModule`, consistente con la duplicación detectada en el árbol.

Truth boundary:

- es correcto afirmar que actualmente el proceso no queda escuchando sin `JWT_KEY`;
- es incorrecto afirmar que la aplicación posee validación de configuración;
- B2 debe mover ese fallo a una validación explícita, temprana, tipada y con mensaje controlado.

## 6. Lint

El script histórico `lint` usa `--fix`, por lo que B0 ejecutó ESLint directamente en modo read-only.

Resultado:

- **474 errores**;
- 0 warnings;
- 453 marcados como potencialmente auto-fixables.

Gran parte es formato/Prettier, pero también aparecen findings de código como imports/variables sin uso y wrapper types (`String`, `Number`, `Boolean`).

B1 debe separar claramente `lint`/`format:check` de cualquier comando mutante. No se utilizará un autofix masivo para ocultar findings semánticos.

## 7. Unit tests

Resultado B0:

- 12 suites;
- 10 fallan;
- 2 pasan;
- 7 tests contabilizados;
- 5 fallan;
- 2 pasan.

Las únicas suites que pasan son scaffolding de carts y no prueban un carrito real.

Dos categorías dominantes de fallo:

1. Jest no resuelve imports absolutos `src/...` usados por el propio proyecto, por ejemplo `src/utils/encryption.util` y `src/users/users.service`.
2. Tests starter construyen servicios sin sus dependencias reales, por ejemplo modelos Mongoose o `ConfigService`.

Esto significa que la suite histórica no puede usarse como red de seguridad para un upgrade de dependencias.

## 8. E2E

La suite e2e no llega a ejecutar ningún test.

Falla durante compilación TypeScript porque el test histórico importa Supertest como namespace y luego lo invoca como función:

`TS2349: This expression is not callable.`

Por eso la expectativa starter `Hello World!` todavía ni siquiera es alcanzada en B0. Después de reparar el harness, ese contrato también deberá reemplazarse porque `/` actualmente redirige a `/login`.

## 9. Qué B0 NO corrige

B0 deja deliberadamente intactos los problemas de aplicación ya auditados:

- doble autoridad de `AuthService`;
- JWT/Auth registrados en varias capas;
- cookie HttpOnly vs Bearer extractor inconsistente;
- riesgo de doble hash en registro;
- reset token raw/logueado;
- recovery enumerable y URL localhost;
- Handlebars con prototype access habilitado;
- falta de ValidationPipe global;
- CRUD/users/products/carts sin matriz de autorización explícita;
- carts y parte de products como scaffolding/placeholder;
- ObjectId tratados como números en endpoints;
- TypeScript con strictness muy baja.

Estos hallazgos ya están asignados a B2-B6. B0 no los modifica para preservar una línea de base verificable.

## 10. Decisión de salida

**B0 queda cerrado como diagnóstico.**

La modernización puede avanzar a B1 porque ahora sabemos con evidencia que:

1. Node 24 + npm pueden instalar y compilar el proyecto histórico;
2. el principal problema no es “Node moderno incompatible”, sino deuda real de dependencias, tooling, tests y runtime;
3. no existe todavía un quality gate confiable;
4. el build no constituye por sí mismo un deployable artifact;
5. configuración/auth deben corregirse antes de hacer un salto de majors;
6. la actualización de dependencias debe hacerse mediante ratchet y tests, no mediante `audit fix --force`.

## Próximo bloque — B1

B1 debe construir el primer piso reproducible sin cambiar el comportamiento de negocio:

- runtime/engines declarados;
- scripts read-only (`format:check`, `lint`, `typecheck`, tests separados);
- `.env.example` seguro;
- higiene `.gitignore`;
- primer workflow permanente PR/main;
- lock/runtime explícitos;
- quality estático/unitario progresivo con deudas visibles, no escondidas.

El workflow `B0 baseline diagnostic` es evidencia diagnóstica y será retirado o convertido a ejecución manual cuando B1 instale el quality gate permanente.