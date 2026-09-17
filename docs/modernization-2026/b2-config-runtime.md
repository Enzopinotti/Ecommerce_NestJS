# B2 — configuración fail-fast, bootstrap y artifact productivo local

Estado: **CERRADO**  
Carril: `modernize/2026-config-runtime`  
Base exacta de entrada: `4e37d36f45bb96f418f9167532e65691ace906fa` (cierre B1)

## Objetivo

B2 convierte el build compilable de B1 en una aplicación cuyo contrato de configuración y runtime puede verificarse de forma reproducible.

El bloque no intenta todavía consolidar autenticación, corregir la suite histórica completa ni actualizar el árbol de dependencias. Su responsabilidad es más acotada y previa: que la aplicación conozca su configuración antes de abrir el puerto, que el bootstrap tenga una sola autoridad y que el artifact de producción pueda servir sus propias vistas/assets sin depender accidentalmente de `src/`.

## Autoridad de verificación de implementación

La primera corrida verde que demuestra el contrato B2 completo es:

- commit: `39e41decf7f30d4f742011e472f3771a450eedca`;
- workflow: `Quality`;
- run: `35245856315`;
- job estático: `quality` — **success**;
- job runtime: `b2-runtime` — **success**;
- Node: `v24.20.0`;
- npm: `11.19.0`;
- Mongo CI: `mongo:7.0.43-jammy`;
- digest de la imagen observada por Docker: `sha256:84c4a18b60a0e73d1577112b0a600b46cab477c64cfe0ff36d0647bbca055bd0`.

Artifacts de esa corrida:

- `static-quality-39e41decf7f30d4f742011e472f3771a450eedca`
  - artifact ID: `10508080236`;
  - digest: `sha256:8bd2f51612bca84217e6d7994f02ea2869b2aba5b2bb9097bc7b48d41919809c`;
- `b2-runtime-39e41decf7f30d4f742011e472f3771a450eedca`
  - artifact ID: `10508035541`;
  - digest: `sha256:47058ba56fec79cf64abf646f45e45e488bce6b7f947aed5def48aef5c30ccf1`.

Los artifacts tienen retención de 30 días. La documentación y el historial Git son la evidencia durable; los artifacts son evidencia complementaria de ejecución.

## 1. Una sola autoridad de configuración

`ConfigModule.forRoot()` ahora se inicializa una sola vez en `AppModule` y queda global:

- `isGlobal: true`;
- `cache: true`;
- `validate: validateEnvironment`.

Se eliminó la segunda inicialización de `ConfigModule` dentro de `UsersModule` y también el provider manual de `ConfigService` que no correspondía.

JWT y Mongo dejaron de consumir valores opcionales silenciosamente:

- JWT usa `ConfigService.getOrThrow('JWT_KEY')`;
- Mongoose usa `ConfigService.getOrThrow('MONGODB_URI')`.

Esto reduce el número de autoridades de configuración y evita que un módulo pueda arrancar con una lectura distinta o incompleta del mismo environment.

## 2. Contrato fail-fast de environment

`src/config/environment.ts` define y normaliza el contrato B2 sin incorporar una dependencia adicional sólo para validar unas pocas variables.

### Requeridas

- `MONGODB_URI`
  - no puede estar vacía;
  - debe usar `mongodb://` o `mongodb+srv://`.
- `JWT_KEY`
  - no puede estar vacía;
  - mínimo 32 caracteres.
- `APP_BASE_URL`
  - URL absoluta;
  - sólo `http://` o `https://`;
  - no permite credenciales embebidas;
  - normaliza `/` finales.

### Defaults explícitos

- `NODE_ENV=development`;
- `PORT=3000`;
- `MAIL_ENABLED=false`.

`NODE_ENV` sólo acepta `development`, `test` o `production` y `PORT` debe ser un entero entre 1 y 65535.

### Mail opt-in

Cuando `MAIL_ENABLED=false`, el backend puede arrancar sin credenciales SMTP. Cuando se habilita el transporte, pasan a ser obligatorias:

- `SERVICE_MAIL`;
- `SERVICE_MAIL_PORT`;
- `EMAIL_USER`;
- `EMAIL_PASSWORD`.

El contrato evita la situación anterior en la que el proceso construía un transport con valores potencialmente `undefined` y recién fallaba al intentar enviar.

## 3. Fallo de bootstrap sin filtrar secretos

El bootstrap captura su fallo de nivel superior, registra un mensaje genérico y termina con código distinto de cero.

La prueba B2 ejecuta procesos separados con:

- `JWT_KEY` ausente;
- `MONGODB_URI` ausente.

En ambos casos verifica:

1. proceso no exitoso;
2. el puerto elegido nunca llega a aceptar HTTP;
3. ni el JWT de prueba ni la URI Mongo de prueba aparecen en stdout/stderr.

El objetivo no es ocultar qué variable está mal durante la validación programática, sino impedir que un error de bootstrap termine imprimiendo el contenido secreto.

## 4. Puerto realmente configurable

`main.ts` ya no hace `listen(3000)`.

El puerto proviene del `ConfigService` validado. El smoke B2 solicita dinámicamente un puerto libre, inicia allí el `dist` real y exige que el proceso registre el puerto configurado.

Por lo tanto, el test no puede pasar simplemente porque el servidor continúe escuchando en 3000.

## 5. ValidationPipe global

El bootstrap instala una frontera global:

- `whitelist: true`;
- `forbidNonWhitelisted: true`;
- `transform: true`;
- errores de validación sin reinyectar `target` ni `value`.

El smoke HTTP valida dos casos reales sobre `POST /users/login`:

- campo desconocido → `400`;
- `password` con tipo inválido → `400`.

### Compatibilidad con DTOs históricos

`CreateUserDto`, `CreateProductDto` y `CreateCategoryDto` todavía no tenían reglas de validación de dominio. Encender whitelist global sin intervenirlos habría convertido sus campos legítimos en propiedades no permitidas.

B2 agrega `@Allow()` únicamente a sus propiedades históricas para preservar el shape ya admitido por la aplicación. Esto **no se presenta como validación completa**. Tipos, constraints y DTOs de query quedan para el bloque de fronteras API/dominio correspondiente.

No se inventaron reglas de negocio para conseguir un test verde.

## 6. Handlebars sin prototype escape por default

El engine que realmente usa el bootstrap se crea ahora con:

- `allowProtoPropertiesByDefault: false`;
- `allowProtoMethodsByDefault: false`.

Los helpers explícitos del proyecto continúan registrados.

El servicio `HandlebarsConfigService` histórico, que ya no participaba del runtime después de centralizar el bootstrap, fue retirado para evitar dos lugares aparentes de configuración del mismo engine.

## 7. Artifact productivo autocontenido

El problema detectado en B0 era concreto: compilar funcionaba, pero `main.ts` buscaba vistas y archivos públicos en `../src/...`.

B2 cambia esa relación:

- views runtime: `path.join(__dirname, 'views')`;
- static runtime: `path.join(__dirname, 'public')`;
- `nest-cli.json` distribuye `views/**/*` y `public/**/*` dentro de `dist`.

No se agregó un `cp` manual post-build. Se usa el contrato de assets del compilador de Nest.

### Prueba dist-only

`scripts/b2/runtime-contract.mjs` hace algo deliberadamente más fuerte que comprobar existencia de archivos:

1. ejecuta `nest build`;
2. comprueba `dist/main.js`;
3. comprueba vista de login, layout y CSS dentro de `dist`;
4. renombra temporalmente `src/views` y `src/public` para que no existan en sus paths normales;
5. levanta `node dist/main.js`;
6. exige `GET /login` → `200`;
7. exige `GET /css/login.css` → `200` y contenido no trivial;
8. restaura siempre los directorios fuente en `finally`.

El log autoritativo termina con:

```text
B2 runtime contract passed.
config=fail-fast port=configured validation=global
views=dist static=dist source-assets=hidden-during-smoke
```

De esta forma un future change que vuelva a depender accidentalmente del source tree rompe CI.

## 8. Mongo real en CI

El job `b2-runtime` se ejecuta después del gate estático y levanta MongoDB como service container con healthcheck real por `mongosh`.

El smoke conecta la aplicación mediante Mongoose al servicio, por lo que valida el wiring de Mongo además del HTTP bootstrap.

### Truth boundary

El Mongo de CI no habilita autenticación. Eso es intencional para un service container efímero aislado del runner y **no representa una configuración productiva recomendada**. B2 no agrega infraestructura de despliegue ni pretende certificar seguridad operacional de una base externa.

## 9. Mail y recovery URL

`MailService` ahora:

- no crea transporte cuando `MAIL_ENABLED=false`;
- usa `getOrThrow()` cuando se habilita;
- devuelve un error de servicio explícito si se intenta enviar con mail deshabilitado;
- no vuelca el error completo del transporte al logger.

El link de recovery deja de usar `http://localhost:3000` y deriva del `APP_BASE_URL` validado.

B2 no rediseña todavía el flujo de recuperación. Token en claro, enumeración de usuario y logs históricos relacionados pertenecen al bloque de auth/recovery correspondiente.

## 10. Quality heredado y ratchet más estricto

La primera corrida B2 mantuvo verde el gate estático de B1 y produjo además una mejora legítima:

- lint B0: 474 errores;
- lint medido en B2: 383 errores;
- mejora: 91 errores menos;
- warnings: 0.

El ratchet se bajó a **383** para impedir que esos 91 errores vuelvan a entrar.

La suite histórica no fue maquillada:

- 12 suites totales;
- 2 suites pasan;
- 10 suites fallan;
- 7 tests registrados;
- 2 tests pasan;
- 5 tests fallan.

Los fallos siguen correspondiendo principalmente a resolución de aliases Jest y providers faltantes en tests scaffolded. Su reparación pertenece a un bloque de tests, no a B2.

## 11. Deuda que B2 deja explícitamente abierta

### Full-project typecheck

Continúa el error histórico del e2e en `test/app.e2e-spec.ts` por el import/call signature de Supertest (`TS2349`). El source deployable sí pasa typecheck.

### Formato

El inventario pasó de 36 archivos fuera de Prettier en B1 a 33 en la corrida de implementación B2. Sigue siendo deuda no bloqueante y no se ejecutó autofix masivo.

### Supply chain

`npm audit --omit=dev --audit-level=high` continúa reportando:

- 27 vulnerabilidades productivas;
- 4 low;
- 5 moderate;
- 15 high;
- 3 critical.

`npm ci` sobre el árbol completo informa 56 advisories totales. B2 no alteró `package-lock.json` ni hizo `npm audit fix --force`.

Entre las familias señaladas siguen apareciendo Nest/Express transitivo, Handlebars, Mongoose, Nodemailer, tar y otras dependencias. Esta evidencia debe guiar el bloque de dependencias; no justifica mezclar majors sin tests.

## 12. Qué significa un workflow verde después de B2

Un `success` significa que:

- toolchain exacto e instalación reproducible pasan;
- source deployable typecheckea y compila;
- lint/unit debt no regresan respecto de sus ratchets;
- config requerida falla antes de escuchar;
- puerto configurable funciona;
- DTO validation global está activa;
- Handlebars no habilita acceso a prototypes por default;
- el artifact `dist` puede renderizar login y servir CSS sin `src/views`/`src/public`;
- la aplicación puede iniciar contra Mongo real de prueba.

No significa que:

- todos los unit/e2e históricos pasen;
- auth esté consolidado;
- recovery sea seguro de punta a punta;
- todas las rutas tengan autorización;
- los DTOs de dominio estén completos;
- dependencias estén saneadas;
- exista una arquitectura de despliegue productiva.

## 13. Próximo bloque — B3

El siguiente bloque del plan es **una sola autoridad de autenticación**.

Debe partir del runtime ya estable de B2 y abordar, sin mezclar todavía todo el dominio:

- consolidar los dos `AuthService`;
- eliminar registros JWT redundantes;
- definir una sola autoridad de credencial para este proyecto server-rendered;
- alinear extractor de JWT con cookie/Bearer según el contrato decidido;
- hacer que `JwtStrategy.validate()` resuelva identidad y no compare contraseñas;
- corregir el doble hash de registro;
- separar 401 de fallos internos;
- evitar devolver el JWT en JSON si la cookie HttpOnly queda como autoridad;
- endurecer flags de cookie según entorno;
- retirar middleware Passport global si deja de ser necesario;
- cubrir login, sesión, registro y logout con pruebas de comportamiento.

B3 debe preservar los gates estático y runtime de B2 como precondición.
