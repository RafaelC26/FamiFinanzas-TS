import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { config } from '../../config.js';
import { autenticarApi, requerirRol } from '../../middlewares/auth.js';
import { esquemas, validar, mesActual } from '../../utils/validacion.js';
import { authService } from '../../services/authService.js';
import { usuarioService } from '../../services/usuarioService.js';
import { categoriaService } from '../../services/categoriaService.js';
import { gastoService, ingresoService } from '../../services/movimientoService.js';
import { presupuestoService } from '../../services/presupuestoService.js';
import { reporteService } from '../../services/reporteService.js';

export const limiteLogin = rateLimit({
  windowMs: config.loginLimite.ventanaMs,
  limit: config.loginLimite.maxIntentos,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: { codigo: 'DEMASIADAS_PETICIONES', mensaje: 'Demasiados intentos de inicio de sesión. Intente más tarde' } },
});

const idParam = (req) => validar(esquemas.id, req.params.id);
const mesQuery = (req) => validar(esquemas.mes, req.query).mes ?? mesActual();
const soloAdmin = requerirRol('ADMIN');

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => res.json({ estado: 'OK', hora: new Date().toISOString() }));

// ---------- Autenticación (RF-01, RF-02, RF-13) ----------
apiRouter.post('/auth/registro', async (req, res) => {
  res.status(201).json(await authService.registrar(validar(esquemas.registro, req.body)));
});
apiRouter.post('/auth/login', limiteLogin, async (req, res) => {
  res.json(await authService.login(validar(esquemas.login, req.body)));
});

// A partir de aquí todas las rutas exigen JWT.
apiRouter.use(autenticarApi);

apiRouter.get('/auth/perfil', (req, res) => res.json(authService.perfil(req.usuario.id)));
apiRouter.put('/auth/password', async (req, res) => {
  await authService.cambiarPassword(req.usuario.id, validar(esquemas.cambioPassword, req.body));
  res.status(204).end();
});

// ---------- Miembros (RF-03) ----------
apiRouter.get('/usuarios', (req, res) => res.json(usuarioService.listar(req.usuario)));
apiRouter.post('/usuarios', soloAdmin, async (req, res) => {
  res.status(201).json(await usuarioService.crear(req.usuario, validar(esquemas.usuarioNuevo, req.body)));
});
apiRouter.get('/usuarios/:id', (req, res) => res.json(usuarioService.obtener(req.usuario, idParam(req))));
apiRouter.put('/usuarios/:id', soloAdmin, (req, res) => {
  res.json(usuarioService.actualizar(req.usuario, idParam(req), validar(esquemas.usuarioEdicion, req.body)));
});
apiRouter.delete('/usuarios/:id', soloAdmin, (req, res) => {
  res.json(usuarioService.desactivar(req.usuario, idParam(req)));
});

// ---------- Categorías (RF-04) ----------
apiRouter.get('/categorias', (req, res) => {
  res.json(categoriaService.listar(req.usuario, { incluirInactivas: req.query.incluirInactivas === 'true' }));
});
apiRouter.post('/categorias', soloAdmin, (req, res) => {
  res.status(201).json(categoriaService.crear(req.usuario, validar(esquemas.categoria, req.body)));
});
apiRouter.get('/categorias/:id', (req, res) => res.json(categoriaService.obtener(req.usuario, idParam(req))));
apiRouter.put('/categorias/:id', soloAdmin, (req, res) => {
  res.json(categoriaService.actualizar(req.usuario, idParam(req), validar(esquemas.categoria, req.body)));
});
apiRouter.delete('/categorias/:id', soloAdmin, (req, res) => res.json(categoriaService.eliminar(req.usuario, idParam(req))));

// ---------- Gastos (RF-05, RF-06, RF-07, RF-10, RF-12) ----------
apiRouter.get('/gastos', (req, res) => res.json(gastoService.listar(req.usuario, validar(esquemas.filtroMovimientos, req.query))));
apiRouter.get('/gastos/exportar', (req, res) => {
  const csv = gastoService.exportarCsv(req.usuario, validar(esquemas.filtroMovimientos, req.query));
  res.type('text/csv; charset=utf-8').attachment('gastos.csv').send(csv);
});
apiRouter.post('/gastos', (req, res) => res.status(201).json(gastoService.crear(req.usuario, validar(esquemas.gasto, req.body))));
apiRouter.get('/gastos/:id', (req, res) => res.json(gastoService.obtener(req.usuario, idParam(req))));
apiRouter.put('/gastos/:id', (req, res) => {
  res.json(gastoService.actualizar(req.usuario, idParam(req), validar(esquemas.gasto, req.body)));
});
apiRouter.delete('/gastos/:id', (req, res) => {
  gastoService.eliminar(req.usuario, idParam(req));
  res.status(204).end();
});

// ---------- Ingresos (RF-08) ----------
apiRouter.get('/ingresos', (req, res) => res.json(ingresoService.listar(req.usuario, validar(esquemas.filtroMovimientos, req.query))));
apiRouter.post('/ingresos', (req, res) => res.status(201).json(ingresoService.crear(req.usuario, validar(esquemas.ingreso, req.body))));
apiRouter.get('/ingresos/:id', (req, res) => res.json(ingresoService.obtener(req.usuario, idParam(req))));
apiRouter.put('/ingresos/:id', (req, res) => {
  res.json(ingresoService.actualizar(req.usuario, idParam(req), validar(esquemas.ingreso, req.body)));
});
apiRouter.delete('/ingresos/:id', (req, res) => {
  ingresoService.eliminar(req.usuario, idParam(req));
  res.status(204).end();
});

// ---------- Presupuestos (RF-09) ----------
apiRouter.get('/presupuestos', (req, res) => res.json(presupuestoService.listar(req.usuario, mesQuery(req))));
apiRouter.post('/presupuestos', soloAdmin, (req, res) => {
  res.status(201).json(presupuestoService.crear(req.usuario, validar(esquemas.presupuesto, req.body)));
});
apiRouter.put('/presupuestos/:id', soloAdmin, (req, res) => {
  const { montoLimite } = validar(esquemas.presupuesto.pick({ montoLimite: true }), req.body);
  res.json(presupuestoService.actualizar(req.usuario, idParam(req), montoLimite));
});
apiRouter.delete('/presupuestos/:id', soloAdmin, (req, res) => {
  presupuestoService.eliminar(req.usuario, idParam(req));
  res.status(204).end();
});

// ---------- Reportes (RF-10, RF-11) ----------
apiRouter.get('/reportes/resumen', (req, res) => res.json(reporteService.resumenMensual(req.usuario, mesQuery(req))));
