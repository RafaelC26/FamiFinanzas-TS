// Carga datos de demostración: npm run seed
import { baseDatos } from './database.js';
import {
  authService, usuarioService, categoriaService, gastoService, ingresoService, presupuestoService, usuarioRepository,
} from '../contenedor.js';
import { MetodoPago, Rol } from '../dominio/enums.js';
import type { Usuario } from '../dominio/Usuario.js';

const EMAIL_ADMIN = 'admin@famifinanzas.co';

if (usuarioRepository.existeEmail(EMAIL_ADMIN)) {
  console.log('Los datos de demostración ya existen. Borre data/famifinanzas.db para regenerarlos.');
  process.exit(0);
}

const { usuario: admin } = await authService.registrar({ familia: 'Familia Gómez', nombre: 'Carlos Gómez', email: EMAIL_ADMIN, password: 'Admin123' });
const laura = await usuarioService.crear(admin, { nombre: 'Laura Martínez', email: 'laura@famifinanzas.co', password: 'Laura123', rol: Rol.MIEMBRO });
const sofia = await usuarioService.crear(admin, { nombre: 'Sofía Gómez', email: 'sofia@famifinanzas.co', password: 'Sofia123', rol: Rol.MIEMBRO });

const cat = new Map(categoriaService.listar(admin).map((c) => [c.nombre, c.id]));
const idCategoria = (nombre: string): number => {
  const id = cat.get(nombre);
  if (id === undefined) throw new Error(`Categoría inicial inexistente: ${nombre}`);
  return id;
};

const hoy = new Date();
const mesOffset = (n: number): string => {
  const d = new Date(hoy.getFullYear(), hoy.getMonth() + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const dia = (mes: string, d: number): string => `${mes}-${String(Math.min(d, 28)).padStart(2, '0')}`;

/** Tupla con nombre: cada fila de la plantilla tiene tipos fijos por posición. */
type FilaPlantilla = [usuario: Usuario, categoria: string, monto: number, dia: number, descripcion: string, metodo: MetodoPago];

const plantilla: FilaPlantilla[] = [
  [admin, 'Vivienda', 1450000, 1, 'Arriendo apartamento', MetodoPago.TRANSFERENCIA],
  [laura, 'Alimentación', 320000, 3, 'Mercado quincenal', MetodoPago.TARJETA_DEBITO],
  [admin, 'Servicios públicos', 185000, 5, 'Energía y agua', MetodoPago.TRANSFERENCIA],
  [laura, 'Servicios públicos', 95000, 6, 'Internet hogar', MetodoPago.TARJETA_CREDITO],
  [sofia, 'Transporte', 60000, 7, 'Recarga tarjeta TransMilenio', MetodoPago.EFECTIVO],
  [admin, 'Transporte', 150000, 8, 'Gasolina', MetodoPago.TARJETA_CREDITO],
  [laura, 'Salud', 120000, 9, 'Medicamentos', MetodoPago.TARJETA_DEBITO],
  [sofia, 'Educación', 210000, 10, 'Materiales universidad', MetodoPago.TARJETA_DEBITO],
  [laura, 'Alimentación', 410000, 12, 'Mercado mensual', MetodoPago.TARJETA_CREDITO],
  [sofia, 'Entretenimiento', 75000, 13, 'Cine en familia', MetodoPago.EFECTIVO],
  [admin, 'Alimentación', 98000, 14, 'Restaurante domingo', MetodoPago.TARJETA_CREDITO],
  [laura, 'Otros', 45000, 15, 'Regalo cumpleaños', MetodoPago.EFECTIVO],
];

const PRESUPUESTOS: ReadonlyArray<[categoria: string, limite: number]> = [
  ['Alimentación', 900000],
  ['Transporte', 250000],
  ['Entretenimiento', 200000],
  ['Servicios públicos', 350000],
];

for (const n of [-2, -1, 0]) {
  const mes = mesOffset(n);
  ingresoService.crear(admin, { monto: 3800000, fecha: dia(mes, 1), fuente: 'Salario', descripcion: 'Salario Carlos' });
  ingresoService.crear(laura, { monto: 2900000, fecha: dia(mes, 1), fuente: 'Salario', descripcion: 'Salario Laura' });
  for (const [categoria, montoLimite] of PRESUPUESTOS) {
    presupuestoService.crear(admin, { categoriaId: idCategoria(categoria), mes, montoLimite });
  }
  for (const [u, c, monto, d, descripcion, metodoPago] of plantilla) {
    if (n === 0 && d > hoy.getDate()) continue; // el mes actual solo hasta hoy
    const variacion = 1 + (((d * 7 + n * 13) % 21) - 10) / 100;
    gastoService.crear(u, { monto: Math.round((monto * variacion) / 100) * 100, fecha: dia(mes, d), categoriaId: idCategoria(c), descripcion, metodoPago });
  }
}

console.log('Datos de demostración creados:');
console.log(`  ADMIN   ${EMAIL_ADMIN} / Admin123`);
console.log('  MIEMBRO laura@famifinanzas.co / Laura123');
console.log('  MIEMBRO sofia@famifinanzas.co / Sofia123');
baseDatos.cerrar();
