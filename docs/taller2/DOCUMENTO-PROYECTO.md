# FamiFinanzas — WebApp de gestión de gastos y presupuesto familiar

**Curso:** Electiva II (60) – 8108277 · **Actividad:** Proyecto Primer 50 % · **Periodo:** II-2026
**Integrantes:** Samuel Salamanca · Rafael Cristancho
**Competencia:** Diseño e implemento aplicaciones con base en las necesidades del negocio.

---

## 1. Dominio del problema

### 1.1 Contexto
En muchos hogares colombianos el dinero lo manejan varias personas (padres, hijos que estudian o trabajan, otros familiares), y cada una gasta por su cuenta: efectivo, tarjetas, transferencias. Los gastos se anotan en cuadernos, en notas del celular o en chats de WhatsApp, o no se anotan. A fin de mes nadie sabe con certeza **en qué se fue la plata**, cuánto queda, ni qué rubro se pasó del presupuesto.

### 1.2 Problema
- No existe un registro único y compartido de los gastos e ingresos del hogar.
- No hay forma de saber durante el mes si una categoría (mercado, transporte, entretenimiento…) va a superar lo planeado, sino cuando ya pasó.
- Los totales se calculan a mano y con errores; comparar meses es casi imposible.

### 1.3 Solución propuesta
**FamiFinanzas** es una aplicación web en la que una familia crea su cuenta, invita a sus miembros y registra sus movimientos desde el PC o el celular. El sistema:
- centraliza gastos e ingresos de todos los miembros, clasificados por categoría;
- permite fijar un presupuesto mensual por categoría y **alerta** al llegar al 80 % y al superarlo;
- calcula automáticamente el resumen del mes (ingresos, gastos, balance, distribución por categoría y por miembro);
- expone todos sus servicios como una **API REST** documentada con **Swagger** y protegida con **JWT**, de modo que otras aplicaciones (por ejemplo una app móvil futura) puedan integrarse.

### 1.4 Actores
| Actor | Descripción |
|---|---|
| **Visitante** | Persona sin sesión. Puede registrar una familia o iniciar sesión. |
| **Miembro** | Integrante de la familia. Registra y consulta gastos e ingresos, ve presupuestos y reportes. Solo puede modificar los movimientos que él registró. |
| **Administrador** | Miembro con privilegios (hereda todo lo del Miembro). Gestiona miembros, categorías y presupuestos, y puede modificar cualquier movimiento de la familia. |

---

## 2. Requisitos funcionales

| ID | Requisito | Actor | Endpoint(s) principal(es) |
|---|---|---|---|
| **RF-01** | El sistema debe permitir registrar una familia junto con su usuario administrador, creando automáticamente un conjunto de categorías de gasto iniciales. | Visitante | `POST /auth/registro` |
| **RF-02** | El sistema debe permitir a los usuarios autenticarse con correo electrónico y contraseña, y emitir un token JWT con vigencia de 2 horas. | Visitante | `POST /auth/login` |
| **RF-03** | El sistema debe permitir al administrador registrar, consultar, actualizar (nombre y rol) y desactivar a los miembros de su familia. | Administrador | `/usuarios` |
| **RF-04** | El sistema debe permitir al administrador crear, consultar, actualizar y eliminar categorías de gasto; si la categoría tiene gastos asociados, el sistema debe desactivarla en lugar de eliminarla. | Administrador | `/categorias` |
| **RF-05** | El sistema debe permitir a los miembros registrar gastos indicando monto, fecha, categoría, método de pago y descripción. | Miembro | `POST /gastos` |
| **RF-06** | El sistema debe permitir consultar los gastos de la familia filtrando por rango de fechas, categoría y miembro, con resultados paginados y la suma total del filtro. | Miembro | `GET /gastos` |
| **RF-07** | El sistema debe permitir editar y eliminar un gasto únicamente a quien lo registró o al administrador de la familia. | Miembro | `PUT/DELETE /gastos/{id}` |
| **RF-08** | El sistema debe permitir registrar, consultar, editar y eliminar los ingresos del hogar indicando monto, fecha, fuente y descripción. | Miembro | `/ingresos` |
| **RF-09** | El sistema debe permitir al administrador definir, modificar y eliminar un presupuesto mensual por categoría, mostrando para cada uno el monto ejecutado y el disponible. | Administrador | `/presupuestos` |
| **RF-10** | El sistema debe generar una alerta cuando el gasto de una categoría alcance el 80 % de su presupuesto mensual y otra cuando lo supere. | Sistema | respuesta de `POST/PUT /gastos`, `GET /reportes/resumen` |
| **RF-11** | El sistema debe generar un resumen mensual con el total de ingresos, total de gastos, balance, distribución del gasto por categoría y por miembro, y las alertas vigentes. | Miembro | `GET /reportes/resumen` |
| **RF-12** | El sistema debe permitir exportar los gastos filtrados a un archivo CSV compatible con Excel. | Miembro | `GET /gastos/exportar` |
| **RF-13** | El sistema debe permitir a cada usuario consultar su perfil y cambiar su contraseña verificando la contraseña actual. | Miembro | `GET /auth/perfil`, `PUT /auth/password` |
| **RF-14** | El sistema debe restringir cada operación según el rol del usuario y garantizar que cada familia acceda únicamente a su propia información. | Sistema | middleware `autenticarApi` / `requerirRol` |

### 2.1 Diagrama de casos de uso

![Casos de uso](diagramas/casos-de-uso.png)

**Relaciones destacadas**
- *Registrar familia* e *Iniciar sesión* **incluyen** *Generar token JWT*.
- *Generar alerta de presupuesto* **extiende** *Registrar gasto* cuando el gasto acumulado de la categoría llega al 80 % del presupuesto.
- *Consultar resumen mensual* **incluye** el cálculo de alertas.
- Las operaciones restringidas **incluyen** *Verificar permisos por rol*.
- *Administrador* es una especialización de *Miembro* (generalización de actores).

### 2.2 Especificación de casos de uso principales

**CU-05 Registrar gasto**
| Campo | Descripción |
|---|---|
| Actor | Miembro (o Administrador) |
| Precondición | El usuario tiene sesión activa (JWT válido) y existe al menos una categoría activa. |
| Flujo básico | 1. El usuario ingresa monto, fecha, categoría, método de pago y descripción. 2. El sistema valida los datos. 3. El sistema verifica que la categoría pertenezca a la familia y esté activa. 4. El sistema guarda el gasto asociado al usuario. 5. El sistema calcula la ejecución del presupuesto de la categoría en ese mes. 6. El sistema confirma el registro. |
| Flujo alterno 5a | Si la ejecución es ≥ 80 % o ≥ 100 %, el sistema devuelve/muestra la alerta correspondiente (RF-10). |
| Excepciones | Datos inválidos → 400 con el detalle por campo. Categoría inexistente o de otra familia → 404. Sin token → 401. |
| Postcondición | El gasto queda registrado y se refleja en el resumen mensual. |

**CU-02 Iniciar sesión**
| Campo | Descripción |
|---|---|
| Actor | Visitante |
| Flujo básico | 1. Ingresa correo y contraseña. 2. El sistema busca el usuario y compara la contraseña con el hash bcrypt. 3. Si es correcta y el usuario está activo, firma un JWT (HS256, 2 h) con `sub`, `fam` y `rol`. 4. Devuelve el token (API) o lo guarda en una cookie *httpOnly* (web). |
| Excepciones | Credenciales incorrectas → 401 con mensaje genérico. Usuario desactivado → 403. Más de 10 intentos fallidos en 15 min → 429. |

**CU-09 Definir presupuesto mensual**
| Campo | Descripción |
|---|---|
| Actor | Administrador |
| Flujo básico | 1. Elige mes, categoría y monto límite. 2. El sistema verifica el rol ADMIN. 3. Verifica que no exista ya un presupuesto para esa categoría y mes. 4. Lo guarda y muestra su ejecución. |
| Excepciones | Rol MIEMBRO → 403. Presupuesto duplicado → 409. |

---

## 3. Diagrama de clases

![Diagrama de clases](diagramas/clases.png)

| Clase | Responsabilidad |
|---|---|
| `Familia` | Unidad de aislamiento de datos (multi-inquilino). Todo dato pertenece a una familia. |
| `Usuario` | Persona que inicia sesión; tiene un `Rol` (ADMIN / MIEMBRO) y puede estar activo o desactivado. |
| `Movimiento` (abstracta) | Atributos comunes de un movimiento de dinero; regla `puedeModificar` (dueño o admin). |
| `Gasto` / `Ingreso` | Especializaciones de `Movimiento`: el gasto tiene categoría y método de pago; el ingreso, una fuente. |
| `Categoria` | Clasificación de los gastos (con color para los gráficos). Se desactiva si tiene historial. |
| `Presupuesto` | Límite mensual de una categoría; calcula su ejecución y `EstadoPresupuesto`. |
| `ResumenMensual`, `Alerta` | Objetos calculados (no persistidos) que produce el servicio de reportes. |

**Modelo relacional implementado** (SQLite): `familias`, `usuarios`, `categorias`, `gastos`, `ingresos`, `presupuestos`, con llaves foráneas, `CHECK (monto > 0)`, `UNIQUE (familia_id, categoria_id, mes)` y los índices `(familia_id, fecha)`.

---

## 4. Diagrama de despliegue

![Diagrama de despliegue](diagramas/despliegue.png)

| Nodo | Componentes / artefactos |
|---|---|
| **Dispositivo del usuario** | Navegador web que recibe páginas HTML generadas con EJS, CSS y JS propios. Guarda el JWT en la cookie `ff_token` (*httpOnly*, *SameSite=Strict*). |
| **Cliente de API** | Swagger UI, Postman u otra aplicación; envía el JWT en la cabecera `Authorization: Bearer`. |
| **Servidor de aplicaciones** | Entorno de ejecución Node.js con la aplicación Express 5. Componentes: front-end (rutas web + vistas EJS), API REST `/api/v1`, Swagger UI `/api-docs`, seguridad JWT, servicios de negocio y repositorios. |
| **Base de datos** | Archivo `famifinanzas.db` (SQLite) accedido con el módulo nativo `node:sqlite` mediante consultas parametrizadas. |

**Arquitectura en capas**

```
Rutas web (EJS) ─┐
                 ├─► Servicios de negocio ─► Repositorios ─► SQLite
API REST (JSON) ─┘        (reglas, permisos,      (SQL parametrizado)
                           alertas, reportes)
```
El front-end y la API **reutilizan los mismos servicios**, por lo que una regla de negocio (por ejemplo, "un miembro solo modifica sus propios gastos") se implementa una sola vez.

---

## 5. Variables de calidad (requisitos no funcionales)

Clasificadas según el modelo **ISO/IEC 25010**. Cada una tiene una métrica verificable y la evidencia de cómo se cumple.

| ID | Característica | Requisito (métrica) | Implementación | Verificación |
|---|---|---|---|---|
| **RNF-01** | Seguridad – Autenticidad | El sistema debe exigir un JWT válido en el 100 % de los endpoints, excepto registro, login y *health*. Los tokens deben expirar a las 2 h y estar firmados con HS256. | Middleware `autenticarApi` / `autenticarWeb`; `jwt.verify` con algoritmo e emisor fijos (rechaza `alg: none`); se valida en cada petición que el usuario siga activo. | Pruebas: 8 rutas → 401 sin token; token con firma alterada, expirado y `alg: none` → 401. |
| **RNF-02** | Seguridad – Confidencialidad | El sistema debe almacenar las contraseñas con bcrypt (costo 10) y nunca devolverlas en las respuestas. Contraseñas de mínimo 8 caracteres con letras y números. | `bcryptjs`; el repositorio solo expone el hash cuando se pide explícitamente; política en el esquema `zod`. | Prueba: el registro no devuelve `passwordHash`; contraseña débil → 400. |
| **RNF-03** | Seguridad – Autorización | El sistema debe impedir que un usuario acceda a datos de otra familia o ejecute operaciones de otro rol. | Todas las consultas SQL filtran por `familia_id` tomado del token; `requerirRol('ADMIN')`; regla de propiedad de movimientos. | Pruebas: otra familia → 404; MIEMBRO crea categoría/presupuesto/miembro → 403; MIEMBRO borra gasto ajeno → 403. |
| **RNF-04** | Seguridad – Resistencia a ataques | El sistema debe bloquear el inicio de sesión tras 10 intentos fallidos en 15 min por IP, enviar cabeceras de seguridad HTTP y no ser vulnerable a inyección SQL ni XSS. | `express-rate-limit`, `helmet` (CSP, HSTS, X-Frame-Options…), consultas parametrizadas, escape automático de EJS (`<%= %>`), validación de entradas con `zod`, límite de 100 KB por petición. | Pruebas: 429 tras los intentos; cabecera CSP presente; `<script>` se muestra escapado. |
| **RNF-05** | Eficiencia – Tiempo de respuesta | El sistema debe responder las operaciones de consulta, registro y resumen en menos de **300 ms (p95)** con 10 000 gastos registrados. | Índices `(familia_id, fecha)`, paginación (máx. 100 por página), consultas por rango de fechas que aprovechan el índice. | `npm run bench`: p95 entre 0,6 ms y 4 ms (ver §8). |
| **RNF-06** | Usabilidad | La interfaz debe ser utilizable desde pantallas de 360 px, en español, con mensajes de error comprensibles, y debe permitir registrar un gasto desde la pantalla de inicio en un solo formulario. | CSS responsivo con menú desplegable, modo oscuro automático, formulario de "gasto rápido" en el resumen, mensajes de validación por campo, confirmación antes de eliminar, barras de progreso de presupuesto con colores de estado. | Revisión manual en 375 px y escritorio. |
| **RNF-07** | Mantenibilidad | El código debe organizarse en capas (rutas → servicios → repositorios) y tener una cobertura de pruebas automatizadas de al menos **70 % de líneas**. | Arquitectura en capas; reglas de negocio solo en servicios; configuración centralizada. | `npm run test:coverage`: 29 pruebas, **91 % de líneas** cubiertas. |
| **RNF-08** | Portabilidad | El sistema debe ejecutarse en Windows, macOS o Linux con Node.js ≥ 22.13, sin dependencias nativas ni servidor de base de datos externo, y configurarse por variables de entorno. | SQLite integrado (`node:sqlite`); `PORT`, `JWT_SECRET`, `DB_PATH`, `JWT_EXPIRES_IN`. | Instalación con `npm install && npm run seed && npm start`. |
| **RNF-09** | Compatibilidad – Interoperabilidad | La API debe seguir el estilo REST (recursos, verbos HTTP, códigos de estado estándar, JSON), estar versionada y documentada con OpenAPI 3. | Prefijo `/api/v1`; 201/204/400/401/403/404/409/429; especificación `openapi.yaml` servida en `/api-docs`. | Swagger UI permite probar cada endpoint. |
| **RNF-10** | Fiabilidad – Integridad | El sistema debe garantizar la integridad de los datos y responder a los errores con un formato uniforme sin exponer detalles internos. | FK, `CHECK`, `UNIQUE`; registro de familia en transacción; desactivación lógica de categorías y usuarios con historial; manejador central de errores `{ error: { codigo, mensaje, detalles } }`. | Pruebas: JSON malformado → 400 `JSON_INVALIDO`; ruta inexistente → 404; siempre queda un administrador activo → 409. |

---

## 6. API REST

Estilo **REST**: los recursos se identifican por URL, las operaciones por el verbo HTTP y el estado viaja en el token (servidor *stateless*).

| Recurso | GET | POST | PUT | DELETE |
|---|---|---|---|---|
| `/auth/registro` | | Registrar familia (201) | | |
| `/auth/login` | | Obtener JWT (200) | | |
| `/auth/perfil` | Perfil | | | |
| `/auth/password` | | | Cambiar contraseña (204) | |
| `/usuarios` | Listar | Crear (ADMIN) | | |
| `/usuarios/{id}` | Consultar | | Actualizar (ADMIN) | Desactivar (ADMIN) |
| `/categorias` | Listar | Crear (ADMIN) | | |
| `/categorias/{id}` | Consultar | | Actualizar (ADMIN) | Eliminar / desactivar (ADMIN) |
| `/gastos` | Listar con filtros | Registrar (201 + alerta) | | |
| `/gastos/exportar` | CSV | | | |
| `/gastos/{id}` | Consultar | | Editar (dueño/ADMIN) | Eliminar (dueño/ADMIN) |
| `/ingresos` | Listar | Registrar | | |
| `/ingresos/{id}` | Consultar | | Editar (dueño/ADMIN) | Eliminar (dueño/ADMIN) |
| `/presupuestos?mes=` | Listar con ejecución | Crear (ADMIN) | | |
| `/presupuestos/{id}` | | | Cambiar límite (ADMIN) | Eliminar (ADMIN) |
| `/reportes/resumen?mes=` | Resumen + alertas | | | |
| `/health` | Estado del servicio | | | |

**Ejemplo**

```http
POST /api/v1/gastos
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Content-Type: application/json

{ "monto": 85000, "fecha": "2026-10-12", "categoriaId": 1, "metodoPago": "TARJETA_DEBITO", "descripcion": "Mercado" }
```
```json
201 Created
{
  "gasto": { "id": 37, "monto": 85000, "fecha": "2026-10-12", "categoria": { "id": 1, "nombre": "Alimentación" }, "usuario": { "id": 2, "nombre": "Laura Martínez" }, ... },
  "alerta": { "estado": "ALERTA", "porcentaje": 84.3, "mensaje": "El presupuesto de Alimentación va en 84.3%" }
}
```

### 6.1 Documentación Swagger
La especificación OpenAPI 3.0 está en `src/docs/openapi.yaml` y se publica en:
- **Swagger UI:** `http://localhost:3000/api-docs`
- **JSON:** `http://localhost:3000/api-docs.json`

Para probar: ejecutar `POST /auth/login` con `admin@famifinanzas.co / Admin123`, copiar el `token`, pulsar **Authorize** y pegarlo.

---

## 7. Seguridad con JSON Web Tokens

![Secuencia JWT](diagramas/secuencia-jwt.png)

| Aspecto | Decisión |
|---|---|
| Algoritmo | HS256 con secreto en la variable `JWT_SECRET` (obligatoria en producción). `jwt.verify` acepta solo `HS256` y emisor `famifinanzas`. |
| Contenido (*claims*) | `sub` (id del usuario), `fam` (familia), `rol`, `nombre`, `iss`, `iat`, `exp`. No contiene datos sensibles. |
| Vigencia | 2 horas (`JWT_EXPIRES_IN`). |
| Transporte en la API | Cabecera `Authorization: Bearer <token>`. |
| Transporte en el front-end | El mismo JWT en una cookie `httpOnly` (no accesible desde JavaScript → mitiga robo por XSS) y `SameSite=Strict` (mitiga CSRF); `Secure` en producción. |
| Revocación | En cada petición se comprueba que el usuario exista y esté activo: desactivar un miembro le quita el acceso de inmediato aunque su token no haya expirado. |
| Autorización | `requerirRol('ADMIN')` para operaciones administrativas; aislamiento por `familia_id`; regla de propiedad de movimientos. |

---

## 8. Front-end

Implementado con el *view engine* **EJS** (renderizado en el servidor), CSS propio responsivo y un pequeño JS de mejora progresiva (confirmaciones, menú móvil, evitar doble envío). La aplicación funciona aun con JavaScript desactivado.

| Pantalla | Ruta | Funcionalidad |
|---|---|---|
| Inicio de sesión / Registro | `/login`, `/registro` | RF-01, RF-02 |
| Resumen | `/dashboard` | Indicadores del mes, alertas, gasto por categoría con barras de presupuesto, gasto por miembro, últimos gastos y formulario de gasto rápido (RF-05, RF-10, RF-11) |
| Gastos | `/gastos` | Registro, filtros, paginación, edición, eliminación y exportación CSV (RF-05 a RF-07, RF-12) |
| Ingresos | `/ingresos` | RF-08 |
| Presupuestos | `/presupuestos` | Ejecución por categoría; el administrador los define y modifica (RF-09) |
| Categorías / Miembros | `/categorias`, `/miembros` | Solo administrador (RF-03, RF-04) |
| Perfil | `/perfil` | Datos y cambio de contraseña (RF-13) |

---

## 9. Evidencias de calidad

**Pruebas automatizadas** (`npm test` / `npm run test:coverage`): 29 pruebas de integración sobre la API y el front-end, base de datos en memoria.

```
ℹ tests 29 · pass 29 · fail 0
ℹ all files | line % 91.43 | branch % 85.96
```

**Rendimiento** (`npm run bench`, 10 000 gastos):

| Operación | p50 (ms) | p95 (ms) |
|---|---|---|
| GET /gastos (página 1) | 1,92 | 2,24 |
| GET /gastos (filtro fechas + categoría) | 0,92 | 1,05 |
| POST /gastos | 0,48 | 0,63 |
| GET /reportes/resumen | 3,70 | 3,89 |
| GET /gastos/exportar (10 000 filas) | 28,11 | 31,57 |

Resultado: **cumple** el objetivo de p95 < 300 ms (RNF-05). *Medido en el equipo de desarrollo; los valores varían según el hardware.*

---

## 10. Tecnologías

| Capa | Tecnología |
|---|---|
| Entorno | Node.js ≥ 22.13 |
| Servidor web / API | Express 5 |
| Vistas | EJS 3 |
| Base de datos | SQLite (`node:sqlite`) |
| Seguridad | jsonwebtoken, bcryptjs, helmet, express-rate-limit |
| Validación | zod |
| Documentación | OpenAPI 3.0 + swagger-ui-express |
| Pruebas | node:test + supertest |
| Diagramas | PlantUML (fuentes `.puml` en `docs/diagramas`) |
