import { z } from 'zod';
import { solicitudInvalida } from './errores.js';

const fecha = z
  .string({ required_error: 'La fecha es obligatoria' })
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener formato AAAA-MM-DD')
  .refine((v) => !Number.isNaN(Date.parse(v)), 'La fecha no es válida');
const mes = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'El mes debe tener formato AAAA-MM');
const monto = z.coerce
  .number({ invalid_type_error: 'El monto debe ser numérico' })
  .positive('El monto debe ser mayor que cero')
  .max(10_000_000_000, 'El monto es demasiado alto');
const id = z.coerce.number().int().positive();
const password = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .max(72, 'La contraseña no puede superar 72 caracteres')
  .regex(/[A-Za-z]/, 'La contraseña debe contener al menos una letra')
  .regex(/\d/, 'La contraseña debe contener al menos un número');
const email = z.string().trim().toLowerCase().email('El correo no es válido');
const nombre = z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(80);

export const METODOS_PAGO = ['EFECTIVO', 'TARJETA_DEBITO', 'TARJETA_CREDITO', 'TRANSFERENCIA'];
export const ROLES = ['ADMIN', 'MIEMBRO'];

export const esquemas = {
  registro: z.object({
    familia: z.string().trim().min(2, 'El nombre de la familia debe tener al menos 2 caracteres').max(80),
    nombre,
    email,
    password,
  }),
  login: z.object({ email, password: z.string().min(1, 'La contraseña es obligatoria') }),
  cambioPassword: z.object({ actual: z.string().min(1, 'La contraseña actual es obligatoria'), nueva: password }),
  usuarioNuevo: z.object({ nombre, email, password, rol: z.enum(ROLES).default('MIEMBRO') }),
  usuarioEdicion: z
    .object({ nombre, rol: z.enum(ROLES), activo: z.coerce.boolean() })
    .partial()
    .refine((o) => Object.keys(o).length > 0, 'Debe enviar al menos un campo'),
  categoria: z.object({
    nombre: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(40),
    color: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, 'El color debe ser hexadecimal (#RRGGBB)')
      .default('#4f46e5'),
  }),
  gasto: z.object({
    monto,
    fecha,
    categoriaId: id,
    descripcion: z.string().trim().max(200).default(''),
    metodoPago: z.enum(METODOS_PAGO, { errorMap: () => ({ message: 'Método de pago no válido' }) }),
  }),
  ingreso: z.object({
    monto,
    fecha,
    fuente: z.string().trim().min(2, 'La fuente debe tener al menos 2 caracteres').max(60),
    descripcion: z.string().trim().max(200).default(''),
  }),
  presupuesto: z.object({ categoriaId: id, mes, montoLimite: monto }),
  filtroMovimientos: z.object({
    desde: fecha.optional(),
    hasta: fecha.optional(),
    categoriaId: id.optional(),
    usuarioId: id.optional(),
    pagina: z.coerce.number().int().min(1).default(1),
    limite: z.coerce.number().int().min(1).max(100).default(20),
  }),
  mes: z.object({ mes: mes.optional() }),
  id,
};

/** Valida datos con un esquema zod; lanza AppError 400 con el detalle por campo. */
export function validar(esquema, datos) {
  const r = esquema.safeParse(datos ?? {});
  if (r.success) return r.data;
  const detalles = r.error.issues.map((i) => ({ campo: i.path.join('.') || null, mensaje: i.message }));
  throw solicitudInvalida(detalles[0].mensaje, detalles);
}

/** Limpia strings vacíos (formularios HTML) para que los campos opcionales queden undefined. */
export function sinVacios(obj = {}) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== '' && v !== undefined && v !== null));
}

export const mesActual = () => new Date().toISOString().slice(0, 7);
