import { Router, type ErrorRequestHandler, type Request, type RequestHandler, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import { config } from '../config.js';
import { actor, autenticarWeb, requerirRol, tokenDeCookie, COOKIE_TOKEN } from '../middlewares/auth.js';
import { AppError } from '../utils/errores.js';
import { esquemas, validar, sinVacios, mesActual, type FiltroMovimientos } from '../utils/validacion.js';
import { ETIQUETA_ESTADO, METODOS_PAGO, NOMBRES_METODO, Rol } from '../dominio/enums.js';
import {
  authService, usuarioService, categoriaService, gastoService, ingresoService, presupuestoService, reporteService,
} from '../contenedor.js';
import { renderizar } from './vistas.js';
import type { EjecucionPresupuestoDTO, ResumenMensualDTO } from '../shared/contratos.js';

const COOKIE_FLASH = 'ff_flash';
const opcionesCookie = { httpOnly: true, sameSite: 'strict', secure: config.entorno === 'production' } as const;
const DOS_HORAS_MS = 2 * 60 * 60 * 1000;

// ---------- Mensajes flash ----------
type TipoFlash = 'ok' | 'aviso' | 'error';
interface MensajeFlash {
  tipo: TipoFlash;
  mensaje: string;
}

/** Type guard: la cookie viene del navegador, así que se valida antes de confiar en ella. */
function esMensajeFlash(v: unknown): v is MensajeFlash {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return ['ok', 'aviso', 'error'].includes(o['tipo'] as string) && typeof o['mensaje'] === 'string';
}

function flash(res: Response, tipo: TipoFlash, mensaje: string): void {
  res.cookie(COOKIE_FLASH, JSON.stringify({ tipo, mensaje } satisfies MensajeFlash), { ...opcionesCookie, maxAge: 10_000 });
}

// ---------- Utilidades de presentación (disponibles en todas las vistas EJS) ----------
const formatoMoneda = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

function nombreMes(mes: string): string {
  const [a = 1970, m = 1] = mes.split('-').map(Number);
  const t = new Date(a, m - 1, 1).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function desplazarMes(mes: string, delta: number): string {
  const [a = 1970, m = 1] = mes.split('-').map(Number);
  const d = new Date(a, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const hoy = (): string => new Date().toLocaleDateString('en-CA');

/** Variables globales de las plantillas: la interfaz documenta qué existe en cada vista. */
interface LocalsGlobales {
  moneda: (v: number | null | undefined) => string;
  NOMBRES_METODO: typeof NOMBRES_METODO;
  ETIQUETA_ESTADO: typeof ETIQUETA_ESTADO;
  METODOS_PAGO: typeof METODOS_PAGO;
  nombreMes: typeof nombreMes;
  desplazarMes: typeof desplazarMes;
  hoy: typeof hoy;
  ruta: string;
  usuario: null;
  flash: MensajeFlash | null;
}

// ---------- Helpers de rutas ----------
type AccionFormulario = (req: Request, res: Response) => void | Promise<void>;
type Destino = string | ((req: Request) => string);

/** Ejecuta una acción de formulario; si falla por una regla de negocio, avisa con flash y redirige. */
const accion = (fn: AccionFormulario, volver: Destino): RequestHandler => async (req, res) => {
  try {
    await fn(req, res);
  } catch (err) {
    if (!(err instanceof AppError)) throw err;
    flash(res, 'error', err.message);
    res.redirect(typeof volver === 'function' ? volver(req) : volver);
  }
};

const mesDe = (req: Request): string => {
  try {
    return validar(esquemas.mes, req.query).mes ?? mesActual();
  } catch {
    return mesActual();
  }
};

const idDe = (req: Request): number => validar(esquemas.id, req.params['id']);

/** Construye los parámetros de filtro conservando solo los usados (para paginación y exportación). */
const queryString = (obj: Record<string, string | number | undefined>): string =>
  new URLSearchParams(Object.entries(sinVacios(obj)).map(([k, v]): [string, string] => [k, String(v)])).toString();

const cuerpo = (req: Request): Record<string, string | undefined> => (req.body ?? {}) as Record<string, string | undefined>;

export const webRouter = Router();

webRouter.use((req, res, next) => {
  const locals: LocalsGlobales = {
    moneda: (v) => formatoMoneda.format(v ?? 0),
    NOMBRES_METODO, ETIQUETA_ESTADO, METODOS_PAGO, nombreMes, desplazarMes, hoy,
    ruta: req.path,
    usuario: null,
    flash: null,
  };
  const cookies = req.cookies as Record<string, string | undefined> | undefined;
  const crudo = cookies?.[COOKIE_FLASH];
  if (crudo) {
    try {
      const valor: unknown = JSON.parse(crudo);
      if (esMensajeFlash(valor)) locals.flash = valor;
    } catch { /* cookie corrupta: se ignora */ }
    res.clearCookie(COOKIE_FLASH);
  }
  Object.assign(res.locals, locals);
  next();
});

// ---------- Páginas públicas ----------
const MENSAJES_LOGIN: Readonly<Record<string, string>> = {
  sesion: 'Su sesión expiró. Inicie sesión de nuevo.',
  salida: 'Sesión cerrada correctamente.',
};

webRouter.get('/', (req, res) => res.redirect(tokenDeCookie(req) ? '/dashboard' : '/login'));

webRouter.get('/login', (req, res) => {
  const msg = typeof req.query['msg'] === 'string' ? req.query['msg'] : '';
  renderizar(res, 'pages/login', { titulo: 'Iniciar sesión', aviso: MENSAJES_LOGIN[msg] ?? null, error: null, email: '' });
});

const limiteLoginWeb = rateLimit({
  windowMs: config.loginLimite.ventanaMs,
  limit: config.loginLimite.maxIntentos,
  skipSuccessfulRequests: true,
  handler: (req, res) =>
    renderizar(res, 'pages/login', {
      titulo: 'Iniciar sesión', aviso: null, email: cuerpo(req)['email'] ?? '',
      error: 'Demasiados intentos. Espere 15 minutos e intente de nuevo.',
    }, 429),
});

webRouter.post('/login', limiteLoginWeb, async (req, res) => {
  try {
    const { token } = await authService.login(validar(esquemas.login, req.body));
    res.cookie(COOKIE_TOKEN, token, { ...opcionesCookie, maxAge: DOS_HORAS_MS });
    res.redirect('/dashboard');
  } catch (err) {
    if (!(err instanceof AppError)) throw err;
    renderizar(res, 'pages/login', { titulo: 'Iniciar sesión', aviso: null, error: err.message, email: cuerpo(req)['email'] ?? '' }, err.status);
  }
});

webRouter.get('/registro', (_req, res) => renderizar(res, 'pages/registro', { titulo: 'Crear cuenta familiar', error: null, datos: {} }));

webRouter.post('/registro', async (req, res) => {
  try {
    const { token } = await authService.registrar(validar(esquemas.registro, req.body));
    res.cookie(COOKIE_TOKEN, token, { ...opcionesCookie, maxAge: DOS_HORAS_MS });
    flash(res, 'ok', '¡Bienvenido! Creamos 8 categorías para empezar. Registre su primer gasto.');
    res.redirect('/dashboard');
  } catch (err) {
    if (!(err instanceof AppError)) throw err;
    const { password: _omitida, ...datos } = cuerpo(req);
    renderizar(res, 'pages/registro', { titulo: 'Crear cuenta familiar', error: err.message, datos }, err.status);
  }
});

webRouter.post('/logout', (_req, res) => {
  res.clearCookie(COOKIE_TOKEN);
  res.redirect('/login?msg=salida');
});

// ---------- Páginas autenticadas ----------
webRouter.use(autenticarWeb);
const soloAdmin = requerirRol(Rol.ADMIN);

/**
 * Endpoints JSON para el frontend TypeScript (client/). Usan la misma cookie
 * httpOnly de la sesión web, así el JS del navegador nunca toca el JWT.
 * `satisfies` comprueba que la respuesta cumple el contrato compartido.
 */
webRouter.get('/datos/resumen', (req, res) => {
  res.json(reporteService.resumenMensual(actor(req), mesDe(req)).toJSON() satisfies ResumenMensualDTO);
});

webRouter.get('/datos/presupuestos', (req, res) => {
  res.json(presupuestoService.listar(actor(req), mesDe(req)) satisfies EjecucionPresupuestoDTO[]);
});

webRouter.get('/dashboard', (req, res) => {
  const yo = actor(req);
  const mes = mesDe(req);
  renderizar(res, 'pages/dashboard', {
    titulo: 'Resumen',
    mes,
    resumen: reporteService.resumenMensual(yo, mes),
    ultimos: gastoService.listar(yo, { desde: `${mes}-01`, hasta: `${mes}-31`, pagina: 1, limite: 5 }).datos,
    categorias: categoriaService.listar(yo),
  });
});

// Gastos
webRouter.get('/gastos', (req, res) => {
  const yo = actor(req);
  let filtro: FiltroMovimientos;
  try {
    filtro = validar(esquemas.filtroMovimientos, sinVacios(req.query));
  } catch (err) {
    res.locals['flash'] = { tipo: 'error', mensaje: err instanceof Error ? err.message : 'Filtro inválido' } satisfies MensajeFlash;
    filtro = validar(esquemas.filtroMovimientos, {});
  }
  const { pagina: _p, limite: _l, ...soloFiltros } = filtro;
  renderizar(res, 'pages/gastos', {
    titulo: 'Gastos',
    resultado: gastoService.listar(yo, filtro),
    filtro,
    qs: queryString(soloFiltros),
    categorias: categoriaService.listar(yo, { incluirInactivas: true }),
    miembros: usuarioService.listar(yo),
  });
});

webRouter.get('/gastos/exportar', (req, res) => {
  const csv = gastoService.exportarCsv(actor(req), validar(esquemas.filtroMovimientos, sinVacios(req.query)));
  res.type('text/csv; charset=utf-8').attachment(`gastos-${hoy()}.csv`).send(csv);
});

const volverGasto = (req: Request): string => (cuerpo(req)['volver'] === 'dashboard' ? '/dashboard' : '/gastos');

webRouter.post('/gastos', accion((req, res) => {
  const { alerta } = gastoService.crear(actor(req), validar(esquemas.gasto, req.body));
  if (alerta) flash(res, alerta.estado === 'EXCEDIDO' ? 'error' : 'aviso', `Gasto registrado. ⚠ ${alerta.mensaje}`);
  else flash(res, 'ok', 'Gasto registrado correctamente');
  res.redirect(volverGasto(req));
}, volverGasto));

webRouter.get('/gastos/:id/editar', (req, res) => {
  const yo = actor(req);
  renderizar(res, 'pages/gasto-editar', { titulo: 'Editar gasto', gasto: gastoService.obtener(yo, idDe(req)), categorias: categoriaService.listar(yo) });
});

webRouter.post('/gastos/:id/editar', accion((req, res) => {
  const { alerta } = gastoService.actualizar(actor(req), idDe(req), validar(esquemas.gasto, req.body));
  flash(res, alerta ? 'aviso' : 'ok', alerta ? `Gasto actualizado. ⚠ ${alerta.mensaje}` : 'Gasto actualizado');
  res.redirect('/gastos');
}, (req) => `/gastos/${req.params['id']}/editar`));

webRouter.post('/gastos/:id/eliminar', accion((req, res) => {
  gastoService.eliminar(actor(req), idDe(req));
  flash(res, 'ok', 'Gasto eliminado');
  res.redirect('/gastos');
}, '/gastos'));

// Ingresos
webRouter.get('/ingresos', (req, res) => {
  const filtro = validar(esquemas.filtroMovimientos, sinVacios(req.query));
  const { pagina: _p, limite: _l, ...soloFiltros } = filtro;
  renderizar(res, 'pages/ingresos', { titulo: 'Ingresos', resultado: ingresoService.listar(actor(req), filtro), filtro, qs: queryString(soloFiltros) });
});

webRouter.post('/ingresos', accion((req, res) => {
  ingresoService.crear(actor(req), validar(esquemas.ingreso, req.body));
  flash(res, 'ok', 'Ingreso registrado correctamente');
  res.redirect('/ingresos');
}, '/ingresos'));

webRouter.get('/ingresos/:id/editar', (req, res) => {
  renderizar(res, 'pages/ingreso-editar', { titulo: 'Editar ingreso', ingreso: ingresoService.obtener(actor(req), idDe(req)) });
});

webRouter.post('/ingresos/:id/editar', accion((req, res) => {
  ingresoService.actualizar(actor(req), idDe(req), validar(esquemas.ingreso, req.body));
  flash(res, 'ok', 'Ingreso actualizado');
  res.redirect('/ingresos');
}, (req) => `/ingresos/${req.params['id']}/editar`));

webRouter.post('/ingresos/:id/eliminar', accion((req, res) => {
  ingresoService.eliminar(actor(req), idDe(req));
  flash(res, 'ok', 'Ingreso eliminado');
  res.redirect('/ingresos');
}, '/ingresos'));

// Presupuestos
webRouter.get('/presupuestos', (req, res) => {
  const yo = actor(req);
  const mes = mesDe(req);
  renderizar(res, 'pages/presupuestos', {
    titulo: 'Presupuestos',
    mes,
    presupuestos: presupuestoService.listar(yo, mes),
    categorias: categoriaService.listar(yo),
  });
});

webRouter.post('/presupuestos', soloAdmin, accion((req, res) => {
  const p = presupuestoService.crear(actor(req), validar(esquemas.presupuesto, req.body));
  flash(res, 'ok', `Presupuesto de ${p.categoria.nombre} definido`);
  res.redirect(`/presupuestos?mes=${p.mes}`);
}, (req) => `/presupuestos?mes=${encodeURIComponent(cuerpo(req)['mes'] ?? '')}`));

webRouter.post('/presupuestos/:id/editar', soloAdmin, accion((req, res) => {
  const { montoLimite } = validar(esquemas.presupuesto.pick({ montoLimite: true }), req.body);
  const p = presupuestoService.actualizar(actor(req), idDe(req), montoLimite);
  flash(res, 'ok', `Presupuesto de ${p.categoria.nombre} actualizado`);
  res.redirect(`/presupuestos?mes=${p.mes}`);
}, '/presupuestos'));

webRouter.post('/presupuestos/:id/eliminar', soloAdmin, accion((req, res) => {
  const yo = actor(req);
  const id = idDe(req);
  const { mes } = presupuestoService.obtener(yo, id);
  presupuestoService.eliminar(yo, id);
  flash(res, 'ok', 'Presupuesto eliminado');
  res.redirect(`/presupuestos?mes=${mes}`);
}, '/presupuestos'));

// Categorías (solo administrador)
webRouter.get('/categorias', soloAdmin, (req, res) => {
  renderizar(res, 'pages/categorias', { titulo: 'Categorías', categorias: categoriaService.listar(actor(req), { incluirInactivas: true }) });
});

webRouter.post('/categorias', soloAdmin, accion((req, res) => {
  categoriaService.crear(actor(req), validar(esquemas.categoria, req.body));
  flash(res, 'ok', 'Categoría guardada');
  res.redirect('/categorias');
}, '/categorias'));

webRouter.post('/categorias/:id/editar', soloAdmin, accion((req, res) => {
  categoriaService.actualizar(actor(req), idDe(req), validar(esquemas.categoria, req.body));
  flash(res, 'ok', 'Categoría actualizada');
  res.redirect('/categorias');
}, '/categorias'));

webRouter.post('/categorias/:id/eliminar', soloAdmin, accion((req, res) => {
  const { resultado } = categoriaService.eliminar(actor(req), idDe(req));
  flash(res, 'ok', resultado === 'DESACTIVADA' ? 'La categoría tiene gastos asociados: se desactivó para conservar el historial' : 'Categoría eliminada');
  res.redirect('/categorias');
}, '/categorias'));

// Miembros (solo administrador)
webRouter.get('/miembros', soloAdmin, (req, res) => {
  renderizar(res, 'pages/miembros', { titulo: 'Miembros de la familia', miembros: usuarioService.listar(actor(req)) });
});

webRouter.post('/miembros', soloAdmin, accion(async (req, res) => {
  const u = await usuarioService.crear(actor(req), validar(esquemas.usuarioNuevo, req.body));
  flash(res, 'ok', `${u.nombre} ahora es miembro de la familia`);
  res.redirect('/miembros');
}, '/miembros'));

webRouter.post('/miembros/:id/editar', soloAdmin, accion((req, res) => {
  const b = cuerpo(req);
  const cambios = sinVacios({ nombre: b['nombre'], rol: b['rol'], activo: b['activo'] === undefined ? undefined : b['activo'] === 'true' });
  const u = usuarioService.actualizar(actor(req), idDe(req), validar(esquemas.usuarioEdicion, cambios));
  flash(res, 'ok', `Miembro ${u.nombre} actualizado`);
  res.redirect('/miembros');
}, '/miembros'));

// Perfil
webRouter.get('/perfil', (req, res) => {
  renderizar(res, 'pages/perfil', { titulo: 'Mi perfil', perfil: authService.perfil(actor(req).id) });
});

webRouter.post('/perfil/password', accion(async (req, res) => {
  await authService.cambiarPassword(actor(req).id, validar(esquemas.cambioPassword, req.body));
  flash(res, 'ok', 'Contraseña actualizada');
  res.redirect('/perfil');
}, '/perfil'));

// ---------- Errores del front-end ----------
webRouter.use((_req, res) => {
  renderizar(res, 'pages/error', { titulo: 'No encontrado', status: 404, mensaje: 'La página que busca no existe.' }, 404);
});

const manejadorErroresWeb: ErrorRequestHandler = (err: unknown, _req, res, _next) => {
  const status = err instanceof AppError ? err.status : 500;
  if (status === 500) console.error(err);
  const mensaje = err instanceof AppError && status !== 500 ? err.message : 'Ocurrió un error inesperado.';
  renderizar(res, 'pages/error', { titulo: 'Error', status, mensaje }, status);
};
webRouter.use(manejadorErroresWeb);
