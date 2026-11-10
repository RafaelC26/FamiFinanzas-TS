import { Router, type Request } from 'express';
import rateLimit from 'express-rate-limit';
import { config } from '../../config.js';
import { actor, autenticarApi, requerirRol } from '../../middlewares/auth.js';
import { esquemas, validar, mesActual } from '../../utils/validacion.js';
import { Rol } from '../../dominio/enums.js';
import {
  authService, usuarioService, categoriaService, gastoService, ingresoService, presupuestoService, reporteService,
} from '../../contenedor.js';
import type { ErrorApiDTO } from '../../shared/contratos.js';

export const limiteLogin = rateLimit({
  windowMs: config.loginLimite.ventanaMs,
  limit: config.loginLimite.maxIntentos,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: { codigo: 'DEMASIADAS_PETICIONES', mensaje: 'Demasiados intentos de inicio de sesión. Intente más tarde' } } satisfies ErrorApiDTO,
});

const idParam = (req: Request): number => validar(esquemas.id, req.params['id']);
const mesQuery = (req: Request): string => validar(esquemas.mes, req.query).mes ?? mesActual();
const soloAdmin = requerirRol(Rol.ADMIN);

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => {
  res.json({ estado: 'OK', hora: new Date().toISOString(), lenguaje: 'TypeScript' });
});

// ---------- Autenticación (RF-01, RF-02, RF-13) ----------
apiRouter.post('/auth/registro', async (req, res) => {
  res.status(201).json(await authService.registrar(validar(esquemas.registro, req.body)));
});
apiRouter.post('/auth/login', limiteLogin, async (req, res) => {
  res.json(await authService.login(validar(esquemas.login, req.body)));
});

// A partir de aquí todas las rutas exigen JWT.
apiRouter.use(autenticarApi);

apiRouter.get('/auth/perfil', (req, res) => {
  res.json(authService.perfil(actor(req).id));
});
apiRouter.put('/auth/password', async (req, res) => {
  await authService.cambiarPassword(actor(req).id, validar(esquemas.cambioPassword, req.body));
  res.status(204).end();
});

// ---------- Miembros (RF-03) ----------
apiRouter.get('/usuarios', (req, res) => {
  res.json(usuarioService.listar(actor(req)));
});
apiRouter.post('/usuarios', soloAdmin, async (req, res) => {
  res.status(201).json(await usuarioService.crear(actor(req), validar(esquemas.usuarioNuevo, req.body)));
});
apiRouter.get('/usuarios/:id', (req, res) => {
  res.json(usuarioService.obtener(actor(req), idParam(req)));
});
apiRouter.put('/usuarios/:id', soloAdmin, (req, res) => {
  res.json(usuarioService.actualizar(actor(req), idParam(req), validar(esquemas.usuarioEdicion, req.body)));
});
apiRouter.delete('/usuarios/:id', soloAdmin, (req, res) => {
  res.json(usuarioService.desactivar(actor(req), idParam(req)));
});

// ---------- Categorías (RF-04) ----------
apiRouter.get('/categorias', (req, res) => {
  res.json(categoriaService.listar(actor(req), { incluirInactivas: req.query['incluirInactivas'] === 'true' }));
});
apiRouter.post('/categorias', soloAdmin, (req, res) => {
  res.status(201).json(categoriaService.crear(actor(req), validar(esquemas.categoria, req.body)));
});
apiRouter.get('/categorias/:id', (req, res) => {
  res.json(categoriaService.obtener(actor(req), idParam(req)));
});
apiRouter.put('/categorias/:id', soloAdmin, (req, res) => {
  res.json(categoriaService.actualizar(actor(req), idParam(req), validar(esquemas.categoria, req.body)));
});
apiRouter.delete('/categorias/:id', soloAdmin, (req, res) => {
  res.json(categoriaService.eliminar(actor(req), idParam(req)));
});

// ---------- Gastos (RF-05, RF-06, RF-07, RF-10, RF-12) ----------
apiRouter.get('/gastos', (req, res) => {
  res.json(gastoService.listar(actor(req), validar(esquemas.filtroMovimientos, req.query)));
});
apiRouter.get('/gastos/exportar', (req, res) => {
  const csv = gastoService.exportarCsv(actor(req), validar(esquemas.filtroMovimientos, req.query));
  res.type('text/csv; charset=utf-8').attachment('gastos.csv').send(csv);
});
apiRouter.post('/gastos', (req, res) => {
  res.status(201).json(gastoService.crear(actor(req), validar(esquemas.gasto, req.body)));
});
apiRouter.get('/gastos/:id', (req, res) => {
  res.json(gastoService.obtener(actor(req), idParam(req)));
});
apiRouter.put('/gastos/:id', (req, res) => {
  res.json(gastoService.actualizar(actor(req), idParam(req), validar(esquemas.gasto, req.body)));
});
apiRouter.delete('/gastos/:id', (req, res) => {
  gastoService.eliminar(actor(req), idParam(req));
  res.status(204).end();
});

// ---------- Ingresos (RF-08) ----------
apiRouter.get('/ingresos', (req, res) => {
  res.json(ingresoService.listar(actor(req), validar(esquemas.filtroMovimientos, req.query)));
});
apiRouter.post('/ingresos', (req, res) => {
  res.status(201).json(ingresoService.crear(actor(req), validar(esquemas.ingreso, req.body)));
});
apiRouter.get('/ingresos/:id', (req, res) => {
  res.json(ingresoService.obtener(actor(req), idParam(req)));
});
apiRouter.put('/ingresos/:id', (req, res) => {
  res.json(ingresoService.actualizar(actor(req), idParam(req), validar(esquemas.ingreso, req.body)));
});
apiRouter.delete('/ingresos/:id', (req, res) => {
  ingresoService.eliminar(actor(req), idParam(req));
  res.status(204).end();
});

// ---------- Presupuestos (RF-09) ----------
apiRouter.get('/presupuestos', (req, res) => {
  res.json(presupuestoService.listar(actor(req), mesQuery(req)));
});
apiRouter.post('/presupuestos', soloAdmin, (req, res) => {
  res.status(201).json(presupuestoService.crear(actor(req), validar(esquemas.presupuesto, req.body)));
});
apiRouter.put('/presupuestos/:id', soloAdmin, (req, res) => {
  const { montoLimite } = validar(esquemas.presupuesto.pick({ montoLimite: true }), req.body);
  res.json(presupuestoService.actualizar(actor(req), idParam(req), montoLimite));
});
apiRouter.delete('/presupuestos/:id', soloAdmin, (req, res) => {
  presupuestoService.eliminar(actor(req), idParam(req));
  res.status(204).end();
});

// ---------- Reportes (RF-10, RF-11) ----------
apiRouter.get('/reportes/resumen', (req, res) => {
  res.json(reporteService.resumenMensual(actor(req), mesQuery(req)));
});
