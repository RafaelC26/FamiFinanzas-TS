// Carga datos de demostración: npm run seed
import { db } from './database.js';
import { authService } from '../services/authService.js';
import { usuarioService } from '../services/usuarioService.js';
import { categoriaService } from '../services/categoriaService.js';
import { gastoService, ingresoService } from '../services/movimientoService.js';
import { presupuestoService } from '../services/presupuestoService.js';
import { usuarioRepository } from '../repositories/usuarioRepository.js';

const EMAIL_ADMIN = 'admin@famifinanzas.co';

if (usuarioRepository.existeEmail(EMAIL_ADMIN)) {
  console.log('Los datos de demostración ya existen. Borre data/famifinanzas.db para regenerarlos.');
  process.exit(0);
}

const { usuario: admin } = await authService.registrar({ familia: 'Familia Gómez', nombre: 'Carlos Gómez', email: EMAIL_ADMIN, password: 'Admin123' });
const laura = await usuarioService.crear(admin, { nombre: 'Laura Martínez', email: 'laura@famifinanzas.co', password: 'Laura123', rol: 'MIEMBRO' });
const sofia = await usuarioService.crear(admin, { nombre: 'Sofía Gómez', email: 'sofia@famifinanzas.co', password: 'Sofia123', rol: 'MIEMBRO' });

const cat = Object.fromEntries(categoriaService.listar(admin).map((c) => [c.nombre, c.id]));
const hoy = new Date();
const mesOffset = (n) => { const d = new Date(hoy.getFullYear(), hoy.getMonth() + n, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
const dia = (mes, d) => `${mes}-${String(Math.min(d, 28)).padStart(2, '0')}`;

const plantilla = [
  [admin, 'Vivienda', 1450000, 1, 'Arriendo apartamento', 'TRANSFERENCIA'],
  [laura, 'Alimentación', 320000, 3, 'Mercado quincenal', 'TARJETA_DEBITO'],
  [admin, 'Servicios públicos', 185000, 5, 'Energía y agua', 'TRANSFERENCIA'],
  [laura, 'Servicios públicos', 95000, 6, 'Internet hogar', 'TARJETA_CREDITO'],
  [sofia, 'Transporte', 60000, 7, 'Recarga tarjeta TransMilenio', 'EFECTIVO'],
  [admin, 'Transporte', 150000, 8, 'Gasolina', 'TARJETA_CREDITO'],
  [laura, 'Salud', 120000, 9, 'Medicamentos', 'TARJETA_DEBITO'],
  [sofia, 'Educación', 210000, 10, 'Materiales universidad', 'TARJETA_DEBITO'],
  [laura, 'Alimentación', 410000, 12, 'Mercado mensual', 'TARJETA_CREDITO'],
  [sofia, 'Entretenimiento', 75000, 13, 'Cine en familia', 'EFECTIVO'],
  [admin, 'Alimentación', 98000, 14, 'Restaurante domingo', 'TARJETA_CREDITO'],
  [laura, 'Otros', 45000, 15, 'Regalo cumpleaños', 'EFECTIVO'],
];

for (const n of [-2, -1, 0]) {
  const mes = mesOffset(n);
  ingresoService.crear(admin, { monto: 3800000, fecha: dia(mes, 1), fuente: 'Salario', descripcion: 'Salario Carlos' });
  ingresoService.crear(laura, { monto: 2900000, fecha: dia(mes, 1), fuente: 'Salario', descripcion: 'Salario Laura' });
  presupuestoService.crear(admin, { categoriaId: cat['Alimentación'], mes, montoLimite: 900000 });
  presupuestoService.crear(admin, { categoriaId: cat['Transporte'], mes, montoLimite: 250000 });
  presupuestoService.crear(admin, { categoriaId: cat['Entretenimiento'], mes, montoLimite: 200000 });
  presupuestoService.crear(admin, { categoriaId: cat['Servicios públicos'], mes, montoLimite: 350000 });
  for (const [u, c, monto, d, descripcion, metodoPago] of plantilla) {
    if (n === 0 && d > hoy.getDate()) continue; // el mes actual solo hasta hoy
    const variacion = 1 + ((d * 7 + n * 13) % 21 - 10) / 100;
    gastoService.crear(u, { monto: Math.round((monto * variacion) / 100) * 100, fecha: dia(mes, d), categoriaId: cat[c], descripcion, metodoPago });
  }
}

console.log('Datos de demostración creados:');
console.log(`  ADMIN   ${EMAIL_ADMIN} / Admin123`);
console.log('  MIEMBRO laura@famifinanzas.co / Laura123');
console.log('  MIEMBRO sofia@famifinanzas.co / Sofia123');
db.close();
