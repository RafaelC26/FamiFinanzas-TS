# FamiFinanzas — migración a TypeScript

Taller TypeScript · Electiva II (60) – 8108277 · UPTC · II-2026
**Integrantes:** Samuel Salamanca · Rafael Cristancho

Migración a **TypeScript** de la WebApp de gestión de gastos, ingresos y presupuesto familiar construida en el
Taller 2 (Node.js + Express + EJS + JWT + Swagger + SQLite). Se migraron el **backend** (`src/*.ts → dist/*.js`)
y el **frontend** (`client/*.ts → public/js/*.js`), y el modelo se reorganizó en una **jerarquía de clases**.

📄 Informe IEEE (LaTeX): [docs/informe/informe.tex](docs/informe/informe.tex) · Documento del Taller 2: [docs/taller2/](docs/taller2/)

## Requisitos
- Node.js **22.13 o superior** (SQLite integrado, no requiere instalar base de datos).

## Ejecutar

```bash
npm install
npm run seed      # compila y crea datos de demostración (opcional)
npm start         # compila (tsc) y abre http://localhost:3000
```

| URL | Descripción |
|---|---|
| http://localhost:3000 | Aplicación web |
| http://localhost:3000/api-docs | Documentación Swagger de la API |
| http://localhost:3000/api/v1 | API REST (JWT Bearer) |

Usuarios de demostración: `admin@famifinanzas.co / Admin123` (ADMIN), `laura@famifinanzas.co / Laura123` (MIEMBRO).

## Scripts

| Comando | Uso |
|---|---|
| `npm run build` | Transpila backend (`tsconfig.json` → `dist/`) y frontend (`tsconfig.client.json` → `public/js/`) |
| `npm run typecheck` | Solo verifica tipos, sin generar archivos |
| `npm start` | Compila e inicia el servidor (`node dist/src/server.js`) |
| `npm run dev` | Compila e inicia con recarga automática del servidor |
| `npm test` | Compila y ejecuta las 41 pruebas (`node --test dist/tests`) |
| `npm run bench` | Mide tiempos de respuesta con 10 000 gastos (RNF-05) |
| `npm run clean` | Borra `dist/` y `public/js/` |

## Estructura

```
src/                     BACKEND (TypeScript)
  dominio/               Jerarquía de clases: Entidad<T> → Usuario, Familia, Categoria, Presupuesto,
                         Movimiento<T> (abstracta) → Gasto, Ingreso; interfaces, enums, objetos de valor
  repositories/          RepositorioBase<TEntidad,TFila> → MovimientoRepository<T> → GastoRepository...
  services/              Clases de negocio; MovimientoService<T,R> abstracto y genérico
  contenedor.ts          Inyección de dependencias (crea y conecta repositorios y servicios)
  routes/                api/index.ts (REST), web.ts (EJS + /datos/* JSON), vistas.ts (render tipado)
  middlewares/           auth (JWT), errores
  shared/contratos.d.ts  DTO compartidos por backend y frontend (solo tipos)
  types/express.d.ts     Ampliación del Request de Express (req.usuario)
  utils/                 errores (jerarquía AppError), validación zod + z.infer
client/                  FRONTEND (TypeScript) → public/js/
  nucleo/                Componente<E> abstracto, ClienteHttp (Resultado<T>), utilidades DOM tipadas
  componentes/           ValidadorFormulario, SimuladorPresupuesto, GraficoCategorias, TablaOrdenable...
views/                   Plantillas EJS (cargan /js/main.js como módulo ES)
tests/                   Pruebas en TS: integración API, vistas web y unitarias del dominio
legacy-js/               Código JavaScript original del Taller 2 (referencia de la migración)
docs/informe/            Informe en LaTeX (plantilla IEEE) con diagramas UML en TikZ
```

## Informe (PDF)
El informe está en `docs/informe/informe.tex` (clase `IEEEtran`). Los diagramas UML están dibujados en TikZ
(`docs/informe/diagramas/`), así que no requiere herramientas externas. Para generar el PDF:

- **Overleaf**: subir la carpeta `docs/informe/` y compilar `informe.tex` con pdfLaTeX.
- **Local** (MiKTeX/TeX Live): `pdflatex informe.tex` dos veces dentro de `docs/informe/`.

## Variables de entorno
| Variable | Por defecto | Descripción |
|---|---|---|
| `PORT` | 3000 | Puerto HTTP |
| `JWT_SECRET` | (valor de desarrollo) | Secreto para firmar los JWT. **Obligatorio en producción** |
| `JWT_EXPIRES_IN` | 2h | Vigencia del token |
| `DB_PATH` | data/famifinanzas.db | Ruta del archivo SQLite |
| `NODE_ENV` | development | `production` activa cookies `Secure` y exige `JWT_SECRET` |
