import type { Response } from 'express';
import type { Categoria } from '../dominio/Categoria.js';
import type { Gasto } from '../dominio/Gasto.js';
import type { Ingreso } from '../dominio/Ingreso.js';
import type { Usuario } from '../dominio/Usuario.js';
import type { ResumenMensual } from '../dominio/ResumenMensual.js';
import type { Pagina } from '../services/MovimientoService.js';
import type { FiltroMovimientos } from '../utils/validacion.js';
import type { EjecucionPresupuestoDTO, PerfilDTO } from '../shared/contratos.js';

/** Datos que reciben todas las páginas. */
interface Base {
  titulo: string;
}

/**
 * Mapa "nombre de vista → datos que necesita". Con esto `renderizar()` exige,
 * en tiempo de compilación, que cada plantilla EJS reciba exactamente sus
 * variables. En JS, olvidar una variable causaba "x is not defined" al abrir la página.
 */
export interface Vistas {
  'pages/login': Base & { aviso: string | null; error: string | null; email: string };
  'pages/registro': Base & { error: string | null; datos: Record<string, unknown> };
  'pages/dashboard': Base & { mes: string; resumen: ResumenMensual; ultimos: Gasto[]; categorias: Categoria[] };
  'pages/gastos': Base & { resultado: Pagina<Gasto>; filtro: FiltroMovimientos; qs: string; categorias: Categoria[]; miembros: Usuario[] };
  'pages/gasto-editar': Base & { gasto: Gasto; categorias: Categoria[] };
  'pages/ingresos': Base & { resultado: Pagina<Ingreso>; filtro: FiltroMovimientos; qs: string };
  'pages/ingreso-editar': Base & { ingreso: Ingreso };
  'pages/presupuestos': Base & { mes: string; presupuestos: EjecucionPresupuestoDTO[]; categorias: Categoria[] };
  'pages/categorias': Base & { categorias: Categoria[] };
  'pages/miembros': Base & { miembros: Usuario[] };
  'pages/perfil': Base & { perfil: PerfilDTO };
  'pages/error': Base & { status: number; mensaje: string };
}

/** Render tipado: el genérico K une el nombre de la vista con la forma de sus datos. */
export function renderizar<K extends keyof Vistas>(res: Response, vista: K, datos: Vistas[K], status = 200): void {
  res.status(status).render(vista, datos);
}
