# Guion de exposición — FamiFinanzas

**Expositores:** Samuel Salamanca · Rafael Cristancho
**Duración estimada:** 18–20 minutos + preguntas

---

## 0. Preparación (antes de entrar)

| Qué | Cómo |
|---|---|
| Datos limpios | Detener el servidor, `rm -f data/famifinanzas.db*`, `npm run seed`, `npm start` |
| Pestaña 1 | http://localhost:3000/login (aplicación web) |
| Pestaña 2 | http://localhost:3000/api-docs (Swagger) |
| Pestaña 3 | Una ventana privada en http://localhost:3000/login (para entrar como miembro) |
| Documento | `FamiFinanzas-Documento-Proyecto.docx` abierto en la sección de diagramas |
| Terminal | Abierta en la carpeta del proyecto, lista para `npm test` y `npm run bench` |
| Credenciales a la mano | Admin: `admin@famifinanzas.co / Admin123` · Miembro: `laura@famifinanzas.co / Laura123` |

**Consejo:** el enunciado evalúa *Funcionalidad (requisitos funcionales) 60 %* y *Variables de calidad 40 %*. Cada vez que se muestre algo, nombrar el requisito que cumple (“esto es el RF-10”, “esto evidencia el RNF-05”).

### Reparto

| Bloque | Expositor | Tiempo |
|---|---|---|
| 1. Introducción y dominio del problema | Samuel | 2 min |
| 2. Requisitos funcionales y casos de uso | Samuel | 3 min |
| 3. Diagrama de clases y de despliegue | Samuel | 3 min |
| 4. Variables de calidad | Rafael | 3 min |
| 5. API REST, Swagger y JWT (demo) | Rafael | 4 min |
| 6. Front-end (demo) | Samuel | 3 min |
| 7. Evidencias: pruebas y rendimiento | Rafael | 1,5 min |
| 8. Cierre | Rafael | 0,5 min |

---

## 1. Introducción y dominio del problema — Samuel (2 min)

**Mostrar:** portada del documento.

> “Buenos días. Somos Samuel Salamanca y Rafael Cristancho, y les vamos a presentar **FamiFinanzas**, una aplicación web para gestionar los gastos y el presupuesto de una familia.”

> “Escogimos un problema del contexto familiar. En la mayoría de hogares el dinero lo manejan varias personas, y cada una gasta por su lado: efectivo, tarjeta, transferencias. Los gastos se anotan en un cuaderno, en notas del celular o no se anotan. Entonces, a fin de mes, nadie sabe en qué se fue la plata ni qué rubro se pasó de lo planeado. Y cuando uno se da cuenta, ya es tarde.”

> “FamiFinanzas resuelve eso: la familia crea una cuenta, invita a sus miembros, y todos registran sus movimientos desde el PC o el celular. El sistema centraliza la información, permite fijar un presupuesto mensual por categoría y **avisa durante el mes** cuando una categoría llega al 80 % o se pasa del presupuesto.”

> “Hay tres actores: el **visitante**, que solo puede registrarse o iniciar sesión; el **miembro**, que registra y consulta gastos e ingresos; y el **administrador**, que además gestiona miembros, categorías y presupuestos.”

---

## 2. Requisitos funcionales y casos de uso — Samuel (3 min)

**Mostrar:** tabla de requisitos funcionales y luego el diagrama de casos de uso.

> “Definimos 14 requisitos funcionales, todos redactados como ‘El sistema debe…’. No los voy a leer todos; los agrupo en cinco bloques:”

- **Acceso (RF-01, RF-02, RF-13):** “El sistema debe permitir registrar una familia con su administrador, autenticarse con correo y contraseña emitiendo un JWT, y cambiar la contraseña.”
- **Administración (RF-03, RF-04, RF-09):** “El sistema debe permitir al administrador gestionar miembros, categorías y presupuestos mensuales.”
- **Movimientos (RF-05 a RF-08):** “El sistema debe permitir registrar, filtrar, editar y eliminar gastos e ingresos.”
- **Análisis (RF-10, RF-11, RF-12):** “El sistema debe generar alertas de presupuesto, un resumen mensual y exportar a CSV.”
- **Control (RF-14):** “El sistema debe restringir cada operación según el rol y aislar los datos de cada familia.”

> “En el diagrama de casos de uso se ven los tres actores. El administrador **hereda** del miembro: puede hacer todo lo que hace un miembro y además lo administrativo.”

> “Quiero resaltar dos relaciones. Primero, *Generar alerta de presupuesto* **extiende** a *Registrar gasto*: la alerta solo ocurre bajo una condición, cuando el gasto acumulado llega al 80 %. Segundo, las operaciones restringidas **incluyen** *Verificar permisos por rol*, porque siempre se ejecuta esa verificación.”

---

## 3. Diagrama de clases y de despliegue — Samuel (3 min)

**Mostrar:** diagrama de clases.

> “En el diagrama de clases, la clase central es **Familia**: todo pertenece a una familia, y eso es lo que nos permite aislar los datos entre hogares.”

> “**Movimiento** es una clase abstracta con lo común —monto, fecha, descripción— y de ella heredan **Gasto** e **Ingreso**. El gasto además tiene categoría y método de pago; el ingreso tiene una fuente.”

> “**Presupuesto** se relaciona con una categoría y un mes, y sabe calcular cuánto se ha ejecutado y su estado: OK, ALERTA o EXCEDIDO. **ResumenMensual** y **Alerta** son objetos calculados: no se guardan, se generan cuando se piden.”

**Mostrar:** diagrama de despliegue.

> “En el despliegue hay tres nodos. El **dispositivo del usuario**, con el navegador que recibe las páginas generadas con EJS. Un **cliente de API**, como Swagger o Postman, que consume la API en JSON. Y el **servidor de aplicaciones**, con Node.js y Express.”

> “Dentro del servidor la aplicación está en capas: el front-end y la API REST usan **los mismos servicios de negocio**, y los servicios usan los **repositorios**, que son los únicos que hablan con la base de datos SQLite. Así una regla, por ejemplo ‘un miembro solo edita sus propios gastos’, se programa una sola vez y aplica en la web y en la API.”

---

## 4. Variables de calidad — Rafael (3 min)

**Mostrar:** tabla de variables de calidad.

> “Las variables de calidad las clasificamos con la norma **ISO/IEC 25010**. Definimos diez, y lo importante es que cada una tiene una **métrica** y una forma de **verificarla**. Voy a destacar las principales.”

- **Seguridad (RNF-01 a RNF-04):** “El 100 % de los endpoints, excepto registro y login, exigen un JWT válido. Las contraseñas se guardan con bcrypt y nunca se devuelven. Una familia no puede ver datos de otra. Y el login se bloquea tras 10 intentos fallidos en 15 minutos.”
- **Rendimiento (RNF-05):** “Las operaciones deben responder en menos de 300 milisegundos con 10.000 gastos. Lo medimos y estamos por debajo de 4 milisegundos.”
- **Usabilidad (RNF-06):** “La interfaz funciona desde pantallas de 360 píxeles, está en español y permite registrar un gasto desde la pantalla de inicio.”
- **Mantenibilidad (RNF-07):** “Arquitectura en capas y al menos 70 % de cobertura de pruebas. Tenemos 91 %.”
- **Portabilidad (RNF-08):** “Corre en Windows, Mac o Linux sin instalar un servidor de base de datos.”
- **Interoperabilidad (RNF-09)** e **integridad (RNF-10):** “API REST versionada y documentada en OpenAPI, y restricciones de integridad en la base de datos.”

> “Al final les mostramos las evidencias de estas métricas.”

---

## 5. API REST, Swagger y JWT — Rafael (4 min, demo)

**Mostrar:** pestaña de Swagger.

> “La API sigue el estilo **REST**: los recursos se identifican por URL —gastos, ingresos, categorías, presupuestos— y la operación la dice el verbo HTTP: GET consulta, POST crea, PUT actualiza y DELETE elimina. Las respuestas usan los códigos estándar: 201 creado, 400 datos inválidos, 401 sin autenticación, 403 sin permiso, 404 no encontrado.”

> “Toda la API está documentada con **Swagger**, a partir de una especificación OpenAPI 3.”

**Demo paso a paso:**

1. Abrir `GET /gastos` → *Try it out* → *Execute*. → “Sin token, el sistema responde **401**. Ningún dato sale sin autenticación.”
2. Abrir `POST /auth/login` → *Try it out* → usar `admin@famifinanzas.co / Admin123` → *Execute*. → “Nos devuelve un **JWT**.”
3. Copiar el token → botón **Authorize** → pegar → *Authorize*.
4. Repetir `GET /gastos` → *Execute*. → “Ahora sí responde 200, con la paginación y la suma total.”
5. `POST /gastos` con monto `500000` en la categoría 1 (Alimentación) y la fecha de hoy. → “Miren el campo **alerta**: el sistema detecta que Alimentación superó su presupuesto. Esto es el **RF-10**.”
6. (Opcional) `POST /gastos` con monto `-5`. → “Responde **400** con el detalle de cada campo inválido.”

> “Sobre el **JWT**: se firma con HS256, dura 2 horas y lleva el id del usuario, su familia y su rol. En cada petición el servidor verifica la firma, que no haya expirado y que el usuario siga activo. Si el administrador desactiva a un miembro, ese miembro pierde el acceso de inmediato aunque su token no haya vencido.”

> “En la API el token va en la cabecera *Authorization*. En la web va en una cookie **httpOnly**, que JavaScript no puede leer, así se protege contra robo por XSS.”

---

## 6. Front-end — Samuel (3 min, demo)

**Mostrar:** pestaña 1, iniciar sesión como administrador.

> “El front-end lo hicimos con el motor de vistas **EJS**: las páginas se generan en el servidor.”

**Demo paso a paso:**

1. **Resumen:** “Aquí está el mes: ingresos, gastos y balance. Abajo las **alertas** —incluida la del gasto que Rafael acaba de registrar por la API, porque ambos usan la misma base de datos—, el gasto por categoría con barras de presupuesto que cambian a amarillo y rojo, y el gasto por miembro.” (**RF-10, RF-11**)
2. **Gasto rápido:** registrar un gasto pequeño desde el formulario del resumen. → “Se registra sin salir de la pantalla de inicio.” (**RF-05, RNF-06**)
3. **Gastos:** filtrar por una categoría. → “Filtros por fecha, categoría y miembro, con paginación.” Pulsar **Exportar CSV**. (**RF-06, RF-12**)
4. **Presupuestos:** “El administrador define el presupuesto mensual por categoría y ve cuánto lleva ejecutado.” (**RF-09**)
5. **Ventana privada, iniciar sesión como Laura (miembro):** “Como miembro, no aparecen Categorías ni Miembros en el menú, y en los gastos de otros no tengo los botones de editar ni eliminar.” (**RF-14**)
6. (Opcional) Reducir el ancho de la ventana o abrir las herramientas de desarrollo en modo celular. → “La interfaz se adapta al celular.” (**RNF-06**)

---

## 7. Evidencias: pruebas y rendimiento — Rafael (1,5 min)

**Mostrar:** terminal.

```bash
npm test
```

> “Tenemos **29 pruebas automatizadas** de integración, y todas pasan. Prueban lo que dijimos de cada requisito: que sin token se recibe 401, que un token alterado o expirado se rechaza, que una familia no ve datos de otra, que un miembro no puede borrar gastos ajenos, que la alerta salta en el 80 % y en el 100 %, y que el login se bloquea.”

```bash
npm run bench
```

> “Este script carga **10.000 gastos** y mide los tiempos. El percentil 95 está por debajo de 4 milisegundos, muy lejos del límite de 300 que fijamos. Así verificamos el RNF-05.”

---

## 8. Cierre — Rafael (30 s)

> “En resumen: identificamos un problema real del contexto familiar, lo modelamos con diagramas de casos de uso, clases y despliegue, definimos 14 requisitos funcionales y 10 variables de calidad medibles, y lo implementamos con una API REST documentada en Swagger, protegida con JWT y con un front-end en EJS. Y cada variable de calidad tiene una evidencia que la respalda.”

> “Muchas gracias. Quedamos atentos a sus preguntas.”

---

## 9. Preguntas probables y respuestas

| Pregunta | Respuesta sugerida |
|---|---|
| ¿Por qué SQLite y no MySQL? | “Porque no requiere instalar ni configurar un servidor: la aplicación corre en cualquier equipo con un solo comando (RNF-08). Aun así es relacional, con llaves foráneas, restricciones e índices. Y como todo el acceso a datos está en los repositorios, cambiar a MySQL o PostgreSQL solo afecta esa capa.” |
| ¿Qué hace que la API sea REST? | “Recursos identificados por URL, operaciones con los verbos HTTP, representación en JSON, códigos de estado estándar y servidor *stateless*: el servidor no guarda sesión, todo el contexto viaja en el token.” |
| ¿Qué pasa si roban el token? | “Dura solo 2 horas. En la web vive en una cookie httpOnly, que JavaScript no puede leer, y SameSite=Strict, que mitiga CSRF. Además, si el administrador desactiva al usuario, el token deja de funcionar de inmediato porque en cada petición verificamos que siga activo.” |
| ¿Qué contiene el JWT? | “El id del usuario (`sub`), la familia (`fam`), el rol, el nombre, el emisor y las fechas de emisión y expiración. No lleva la contraseña ni datos sensibles.” |
| ¿Cómo evitan que una familia vea datos de otra? | “Todas las consultas filtran por el `familia_id` que viene dentro del token firmado, no de lo que mande el cliente. Si alguien pide un gasto de otra familia, responde 404, como si no existiera.” |
| ¿Cómo se guardan las contraseñas? | “Con bcrypt, que es un hash con sal y costo ajustable. Nunca se guardan ni se devuelven en texto plano.” |
| ¿Por qué no se borran las categorías con gastos? | “Para no perder el historial: si se borrara, los gastos viejos quedarían sin categoría. Se desactiva, y deja de aparecer para gastos nuevos.” |
| ¿Por qué EJS y no React? | “El enunciado permite un *engine view* o un framework. EJS genera las páginas en el servidor, así la aplicación funciona incluso sin JavaScript y reutiliza directamente los servicios. Y la API queda lista para que un front-end en React o una app móvil la consuma.” |
| ¿Cómo se protegen contra inyección SQL y XSS? | “SQL: todas las consultas son parametrizadas. XSS: EJS escapa automáticamente el contenido; hay una prueba que registra un gasto con `<script>` y verifica que se muestra como texto. Además usamos Helmet, que envía cabeceras como Content-Security-Policy.” |
| ¿Cómo midieron el rendimiento? | “Con un script que inserta 10.000 gastos y hace 200 peticiones por operación, calculando el percentil 50 y el 95.” |
| ¿Qué mejorarían? | “Recuperación de contraseña por correo, gráficos históricos comparando meses, gastos recurrentes como el arriendo y una app móvil que consuma la misma API.” |

---

## 10. Plan B si algo falla

| Problema | Solución |
|---|---|
| `npm start` dice `EADDRINUSE` | Ya hay un servidor en el puerto 3000: usar ese, o iniciar con `PORT=3001 npm start` |
| La sesión expiró durante la demo | Volver a iniciar sesión (los tokens duran 2 h) |
| “Demasiados intentos” en el login | Reiniciar el servidor (el contador está en memoria) |
| Los datos quedaron desordenados | Detener el servidor, `rm -f data/famifinanzas.db*`, `npm run seed`, `npm start` |
| No hay Internet | No hace falta: todo funciona en local, incluido Swagger |
