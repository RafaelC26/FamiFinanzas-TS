import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { config } from '../config.js';
import { autenticarWeb, requerirRol, COOKIE_TOKEN } from '../middlewares/auth.js';
import { AppError } from '../utils/errores.js';
import { esquemas, validar, sinVacios, mesActual, METODOS_PAGO } from '../utils/validacion.js';
import { authService } from '../services/authService.js';
import { usuarioService } from '../services/usuarioService.js';
import { categoriaService } from '../services/categoriaService.js';
import { gastoService, ingresoService } from '../services/movimientoService.js';
import { presupuestoService } from '../services/presupuestoService.js';
import { reporteService } from '../services/reporteService.js';

const COOKIE_FLASH = 'ff_flash';
const opcionesCookie = { httpOnly: true, sameSite: 'strict', secure: config.entorno === 'production' };

// ---------- Utilidades de presentación ----------
const moneda = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const NOMBRES_METODO = { EFECTIVO: 'Efectivo', TARJETA_DEBITO: 'Tarjeta débito', TARJETA_CREDITO: 'Tarjeta crédito', TRANSFERENCIA: 'Transferencia' };
const ETIQUETA_ESTADO = { OK: 'En rango', ALERTA: 'Alerta', EXCEDIDO: 'Excedido', SIN_PRESUPUESTO: 'Sin presupuesto' };

function nombreMes(mes) {
  const [a, m] = mes.split('-').map(Number);
  const t = new Date(a, m - 1, 1).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
  return t.charAt(0).toUpperCase() + t.slice(1);
}
function desplazarMes(mes, delta) {
  const [a, m] = mes.split('-').map(Number);
  const d = new Date(a, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
const hoy = () => new Date().toLocaleDateString('en-CA');

function flash(res, tipo, mensaje) {
  res.cookie(COOKIE_FLASH, JSON.stringify({ tipo, mensaje }), { ...opcionesCookie, maxAge: 10_000 });
}

/** Ejecuta una acción de formulario; si falla por una regla de negocio, avisa y redirige. */
const accion = (fn, volver) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (err) {
    if (!(err instanceof AppError)) throw err;
    flash(res, 'error', err.message);
    res.redirect(typeof volver === 'function' ? volver(req) : volver);
  }
};

const mesDe = (req) => {
  try { return validar(esquemas.mes, req.query).mes ?? mesActual(); } catch { return mesActual(); }
};

/** Construye los parámetros de filtro conservando solo los usados (para paginación y exportación). */
const queryString = (obj) => new URLSearchParams(sinVacios(obj)).toString();

export const webRouter = Router();

webRouter.use((req, res, next) => {
  Object.assign(res.locals, { moneda: (v) => moneda.format(v ?? 0), NOMBRES_METODO, ETIQUETA_ESTADO, METODOS_PAGO, nombreMes, desplazarMes, hoy, ruta: req.path, usuario: null, flash: null });
  if (req.cookies?.[COOKIE_FLASH]) {
    try { res.locals.flash = JSON.parse(req.cookies[COOKIE_FLASH]); } catch { /* cookie corrupta: se ignora */ }
    res.clearCookie(COOKIE_FLASH);
  }
  next();
});

// ---------- Páginas públicas ----------
const MENSAJES_LOGIN = { sesion: 'Su sesión expiró. Inicie sesión de nuevo.', salida: 'Sesión cerrada correctamente.' };

webRouter.get('/', (req, res) => res.redirect(req.cookies?.[COOKIE_TOKEN] ? '/dashboard' : '/login'));

webRouter.get('/login', (req, res) => {
  res.render('pages/login', { titulo: 'Iniciar sesión', aviso: MENSAJES_LOGIN[req.query.msg], error: null, email: '' });
});

const limiteLoginWeb = rateLimit({
  windowMs: config.loginLimite.ventanaMs,
  limit: config.loginLimite.maxIntentos,
  skipSuccessfulRequests: true,
  handler: (req, res) =>
    res.status(429).render('pages/login', { titulo: 'Iniciar sesión', aviso: null, email: req.body?.email ?? '', error: 'Demasiados intentos. Espere 15 minutos e intente de nuevo.' }),
});

webRouter.post('/login', limiteLoginWeb, async (req, res) => {
  try {
    const { token } = await authService.login(validar(esquemas.login, req.body));
    res.cookie(COOKIE_TOKEN, token, { ...opcionesCookie, maxAge: 2 * 60 * 60 * 1000 });
    res.redirect('/dashboard');
  } catch (err) {
    if (!(err instanceof AppError)) throw err;
    res.status(err.status).render('pages/login', { titulo: 'Iniciar sesión', aviso: null, error: err.message, email: req.body?.email ?? '' });
  }
});

webRouter.get('/registro', (_req, res) => res.render('pages/registro', { titulo: 'Crear cuenta familiar', error: null, datos: {} }));

webRouter.post('/registro', async (req, res) => {
  try {
    const { token } = await authService.registrar(validar(esquemas.registro, req.body));
    res.cookie(COOKIE_TOKEN, token, { ...opcionesCookie, maxAge: 2 * 60 * 60 * 1000 });
    flash(res, 'ok', '¡Bienvenido! Creamos 8 categorías para empezar. Registre su primer gasto.');
    res.redirect('/dashboard');
  } catch (err) {
    if (!(err instanceof AppError)) throw err;
    const { password, ...datos } = req.body ?? {};
    res.status(err.status).render('pages/registro', { titulo: 'Crear cuenta familiar', error: err.message, datos });
  }
});

webRouter.post('/logout', (_req, res) => {
  res.clearCookie(COOKIE_TOKEN);
  res.redirect('/login?msg=salida');
});

// ---------- Páginas autenticadas ----------
webRouter.use(autenticarWeb);
const soloAdmin = requerirRol('ADMIN');

webRouter.get('/dashboard', (req, res) => {
  const mes = mesDe(req);
  res.render('pages/dashboard', {
    titulo: 'Resumen',
    mes,
    resumen: reporteService.resumenMensual(req.usuario, mes),
    ultimos: gastoService.listar(req.usuario, { desde: `${mes}-01`, hasta: `${mes}-31`, pagina: 1, limite: 5 }).datos,
    categorias: categoriaService.listar(req.usuario),
  });
});

// Gastos
webRouter.get('/gastos', (req, res) => {
  const filtroCrudo = sinVacios(req.query);
  let filtro;
  try { filtro = validar(esquemas.filtroMovimientos, filtroCrudo); } catch (err) {
    res.locals.flash = { tipo: 'error', mensaje: err.message };
    filtro = validar(esquemas.filtroMovimientos, {});
  }
  const { pagina, limite, ...soloFiltros } = filtro;
  res.render('pages/gastos', {
    titulo: 'Gastos',
    resultado: gastoService.listar(req.usuario, filtro),
    filtro,
    qs: queryString(soloFiltros),
    categorias: categoriaService.listar(req.usuario, { incluirInactivas: true }),
    miembros: usuarioService.listar(req.usuario),
  });
});

webRouter.get('/gastos/exportar', (req, res) => {
  const csv = gastoService.exportarCsv(req.usuario, validar(esquemas.filtroMovimientos, sinVacios(req.query)));
  res.type('text/csv; charset=utf-8').attachment(`gastos-${hoy()}.csv`).send(csv);
});

webRouter.post('/gastos', accion((req, res) => {
  const { alerta } = gastoService.crear(req.usuario, validar(esquemas.gasto, req.body));
  if (alerta) flash(res, alerta.estado === 'EXCEDIDO' ? 'error' : 'aviso', `Gasto registrado. ⚠ ${alerta.mensaje}`);
  else flash(res, 'ok', 'Gasto registrado correctamente');
  res.redirect(req.body.volver === 'dashboard' ? '/dashboard' : '/gastos');
}, (req) => (req.body?.volver === 'dashboard' ? '/dashboard' : '/gastos')));

webRouter.get('/gastos/:id/editar', (req, res) => {
  res.render('pages/gasto-editar', {
    titulo: 'Editar gasto',
    gasto: gastoService.obtener(req.usuario, validar(esquemas.id, req.params.id)),
    categorias: categoriaService.listar(req.usuario),
  });
});

webRouter.post('/gastos/:id/editar', accion((req, res) => {
  const { alerta } = gastoService.actualizar(req.usuario, validar(esquemas.id, req.params.id), validar(esquemas.gasto, req.body));
  flash(res, alerta ? 'aviso' : 'ok', alerta ? `Gasto actualizado. ⚠ ${alerta.mensaje}` : 'Gasto actualizado');
  res.redirect('/gastos');
}, (req) => `/gastos/${req.params.id}/editar`));

webRouter.post('/gastos/:id/eliminar', accion((req, res) => {
  gastoService.eliminar(req.usuario, validar(esquemas.id, req.params.id));
  flash(res, 'ok', 'Gasto eliminado');
  res.redirect('/gastos');
}, '/gastos'));

// Ingresos
webRouter.get('/ingresos', (req, res) => {
  const filtro = validar(esquemas.filtroMovimientos, sinVacios(req.query));
  const { pagina, limite, ...soloFiltros } = filtro;
  res.render('pages/ingresos', { titulo: 'Ingresos', resultado: ingresoService.listar(req.usuario, filtro), filtro, qs: queryString(soloFiltros) });
});

webRouter.post('/ingresos', accion((req, res) => {
  ingresoService.crear(req.usuario, validar(esquemas.ingreso, req.body));
  flash(res, 'ok', 'Ingreso registrado correctamente');
  res.redirect('/ingresos');
}, '/ingresos'));

webRouter.get('/ingresos/:id/editar', (req, res) => {
  res.render('pages/ingreso-editar', { titulo: 'Editar ingreso', ingreso: ingresoService.obtener(req.usuario, validar(esquemas.id, req.params.id)) });
});

webRouter.post('/ingresos/:id/editar', accion((req, res) => {
  ingresoService.actualizar(req.usuario, validar(esquemas.id, req.params.id), validar(esquemas.ingreso, req.body));
  flash(res, 'ok', 'Ingreso actualizado');
  res.redirect('/ingresos');
}, (req) => `/ingresos/${req.params.id}/editar`));

webRouter.post('/ingresos/:id/eliminar', accion((req, res) => {
  ingresoService.eliminar(req.usuario, validar(esquemas.id, req.params.id));
  flash(res, 'ok', 'Ingreso eliminado');
  res.redirect('/ingresos');
}, '/ingresos'));

// Presupuestos
webRouter.get('/presupuestos', (req, res) => {
  const mes = mesDe(req);
  res.render('pages/presupuestos', {
    titulo: 'Presupuestos',
    mes,
    presupuestos: presupuestoService.listar(req.usuario, mes),
    categorias: categoriaService.listar(req.usuario),
  });
});

webRouter.post('/presupuestos', soloAdmin, accion((req, res) => {
  const p = presupuestoService.crear(req.usuario, validar(esquemas.presupuesto, req.body));
  flash(res, 'ok', `Presupuesto de ${p.categoria.nombre} definido`);
  res.redirect(`/presupuestos?mes=${p.mes}`);
}, (req) => `/presupuestos?mes=${encodeURIComponent(req.body?.mes ?? '')}`));

webRouter.post('/presupuestos/:id/editar', soloAdmin, accion((req, res) => {
  const { montoLimite } = validar(esquemas.presupuesto.pick({ montoLimite: true }), req.body);
  const p = presupuestoService.actualizar(req.usuario, validar(esquemas.id, req.params.id), montoLimite);
  flash(res, 'ok', `Presupuesto de ${p.categoria.nombre} actualizado`);
  res.redirect(`/presupuestos?mes=${p.mes}`);
}, '/presupuestos'));

webRouter.post('/presupuestos/:id/eliminar', soloAdmin, accion((req, res) => {
  const id = validar(esquemas.id, req.params.id);
  const { mes } = presupuestoService.obtener(req.usuario, id);
  presupuestoService.eliminar(req.usuario, id);
  flash(res, 'ok', 'Presupuesto eliminado');
  res.redirect(`/presupuestos?mes=${mes}`);
}, '/presupuestos'));

// Categorías (solo administrador)
webRouter.get('/categorias', soloAdmin, (req, res) => {
  res.render('pages/categorias', { titulo: 'Categorías', categorias: categoriaService.listar(req.usuario, { incluirInactivas: true }) });
});

webRouter.post('/categorias', soloAdmin, accion((req, res) => {
  categoriaService.crear(req.usuario, validar(esquemas.categoria, req.body));
  flash(res, 'ok', 'Categoría guardada');
  res.redirect('/categorias');
}, '/categorias'));

webRouter.post('/categorias/:id/editar', soloAdmin, accion((req, res) => {
  categoriaService.actualizar(req.usuario, validar(esquemas.id, req.params.id), validar(esquemas.categoria, req.body));
  flash(res, 'ok', 'Categoría actualizada');
  res.redirect('/categorias');
}, '/categorias'));

webRouter.post('/categorias/:id/eliminar', soloAdmin, accion((req, res) => {
  const { resultado } = categoriaService.eliminar(req.usuario, validar(esquemas.id, req.params.id));
  flash(res, 'ok', resultado === 'DESACTIVADA' ? 'La categoría tiene gastos asociados: se desactivó para conservar el historial' : 'Categoría eliminada');
  res.redirect('/categorias');
}, '/categorias'));

// Miembros (solo administrador)
webRouter.get('/miembros', soloAdmin, (req, res) => {
  res.render('pages/miembros', { titulo: 'Miembros de la familia', miembros: usuarioService.listar(req.usuario) });
});

webRouter.post('/miembros', soloAdmin, accion(async (req, res) => {
  const u = await usuarioService.crear(req.usuario, validar(esquemas.usuarioNuevo, req.body));
  flash(res, 'ok', `${u.nombre} ahora es miembro de la familia`);
  res.redirect('/miembros');
}, '/miembros'));

webRouter.post('/miembros/:id/editar', soloAdmin, accion((req, res) => {
  const cambios = sinVacios({ nombre: req.body.nombre, rol: req.body.rol, activo: req.body.activo === undefined ? undefined : req.body.activo === 'true' });
  const u = usuarioService.actualizar(req.usuario, validar(esquemas.id, req.params.id), validar(esquemas.usuarioEdicion, cambios));
  flash(res, 'ok', `Miembro ${u.nombre} actualizado`);
  res.redirect('/miembros');
}, '/miembros'));

// Perfil
webRouter.get('/perfil', (req, res) => res.render('pages/perfil', { titulo: 'Mi perfil', perfil: authService.perfil(req.usuario.id) }));

webRouter.post('/perfil/password', accion(async (req, res) => {
  await authService.cambiarPassword(req.usuario.id, validar(esquemas.cambioPassword, req.body));
  flash(res, 'ok', 'Contraseña actualizada');
  res.redirect('/perfil');
}, '/perfil'));

// ---------- Errores del front-end ----------
webRouter.use((req, res) => res.status(404).render('pages/error', { titulo: 'No encontrado', status: 404, mensaje: 'La página que busca no existe.' }));

webRouter.use((err, req, res, _next) => {
  const status = err instanceof AppError ? err.status : 500;
  if (status === 500) console.error(err);
  const mensaje = status === 500 ? 'Ocurrió un error inesperado.' : err.message;
  res.status(status).render('pages/error', { titulo: 'Error', status, mensaje });
});
