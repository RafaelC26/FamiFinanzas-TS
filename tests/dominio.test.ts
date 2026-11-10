// Pruebas unitarias de la jerarquía de clases del dominio (no usan base de datos ni HTTP).
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Usuario } from '../src/dominio/Usuario.js';
import { Gasto } from '../src/dominio/Gasto.js';
import { Ingreso } from '../src/dominio/Ingreso.js';
import { Movimiento } from '../src/dominio/Movimiento.js';
import { Entidad } from '../src/dominio/Entidad.js';
import { EjecucionPresupuesto, Presupuesto } from '../src/dominio/Presupuesto.js';
import { ResumenMensual } from '../src/dominio/ResumenMensual.js';
import { EstadoPresupuesto, MetodoPago, Rol } from '../src/dominio/enums.js';
import { AppError, NoEncontradoError, ProhibidoError } from '../src/utils/errores.js';

const crearUsuario = (id: number, rol: Rol): Usuario =>
  new Usuario({ id, familiaId: 1, nombre: `Usuario ${id}`, email: `u${id}@t.co`, rol, activo: true, creadoEn: '2026-01-01', passwordHash: 'secreto' });

const admin = crearUsuario(1, Rol.ADMIN);
const miembro = crearUsuario(2, Rol.MIEMBRO);
const otroMiembro = crearUsuario(3, Rol.MIEMBRO);

const gastoDe = (autor: Usuario): Gasto =>
  new Gasto({
    id: 10, monto: 50000, fecha: '2026-11-05', descripcion: 'Mercado', creadoEn: '2026-11-05',
    usuario: { id: autor.id, nombre: autor.nombre }, metodoPago: MetodoPago.EFECTIVO,
    categoria: { id: 1, nombre: 'Alimentación', color: '#16a34a' },
  });

describe('Jerarquía Entidad → Movimiento → Gasto / Ingreso', () => {
  test('Gasto e Ingreso son Movimientos y Entidades (herencia)', () => {
    const g = gastoDe(miembro);
    const i = new Ingreso({ id: 1, monto: 1, fecha: '2026-11-01', descripcion: '', creadoEn: '', usuario: { id: 2, nombre: 'x' }, fuente: 'Salario' });
    assert.ok(g instanceof Movimiento && g instanceof Entidad);
    assert.ok(i instanceof Movimiento && i instanceof Entidad);
    assert.equal(g.tipo, 'GASTO'); // polimorfismo
    assert.equal(i.tipo, 'INGRESO');
    assert.equal(g.mes, '2026-11');
  });

  test('RF-07 regla de propiedad: dueño o administrador', () => {
    const g = gastoDe(miembro);
    assert.equal(g.puedeSerModificadoPor(miembro), true);
    assert.equal(g.puedeSerModificadoPor(admin), true);
    assert.equal(g.puedeSerModificadoPor(otroMiembro), false);
  });

  test('toJSON produce el DTO esperado y la fila CSV respeta el encabezado', () => {
    const g = gastoDe(miembro);
    assert.deepEqual(Object.keys(g.toJSON()).sort(), ['categoria', 'creadoEn', 'descripcion', 'fecha', 'id', 'metodoPago', 'monto', 'usuario']);
    assert.equal(g.aFilaCsv().length, Gasto.ENCABEZADO_CSV.length);
  });
});

describe('Encapsulamiento de Usuario', () => {
  test('el hash es privado (#passwordHash): no sale en JSON, spread ni Object.keys', () => {
    assert.equal(admin.hashContrasena, 'secreto');
    assert.ok(!JSON.stringify(admin).includes('secreto'));
    assert.ok(!Object.keys({ ...admin }).some((k) => k.toLowerCase().includes('hash')));
    assert.equal(admin.esAdmin(), true);
    assert.equal(miembro.esAdmin(), false);
  });
});

describe('RF-10 EjecucionPresupuesto (objeto de valor)', () => {
  const casos: Array<[gastado: number, estado: EstadoPresupuesto, porcentaje: number | null]> = [
    [50_000, EstadoPresupuesto.OK, 50],
    [80_000, EstadoPresupuesto.ALERTA, 80],
    [100_000, EstadoPresupuesto.EXCEDIDO, 100],
  ];
  for (const [gastado, estado, porcentaje] of casos) {
    test(`${gastado} de 100000 → ${estado}`, () => {
      const e = EjecucionPresupuesto.calcular(gastado, 100_000, 0.8);
      assert.equal(e.estado, estado);
      assert.equal(e.porcentaje, porcentaje);
    });
  }

  test('sin límite no hay presupuesto', () => {
    const e = EjecucionPresupuesto.calcular(10, null, 0.8);
    assert.equal(e.estado, EstadoPresupuesto.SIN_PRESUPUESTO);
    assert.equal(e.requiereAlerta, false);
  });

  test('Presupuesto.conEjecucion agrega gastado, estado y porcentaje', () => {
    const p = new Presupuesto({ id: 1, mes: '2026-11', montoLimite: 200_000, categoria: { id: 1, nombre: 'Transporte', color: '#000000' } });
    const dto = p.conEjecucion(190_000, 0.8);
    assert.equal(dto.estado, 'ALERTA');
    assert.equal(dto.porcentaje, 95);
  });
});

describe('ResumenMensual', () => {
  test('calcula balance, participación y alertas', () => {
    const r = new ResumenMensual({
      mes: '2026-11', totalIngresos: 1_000_000, totalGastos: 400_000, cantidadGastos: 3, umbralAlerta: 0.8,
      porMiembro: [],
      categorias: [
        { id: 1, nombre: 'Alimentación', color: '#0f0', total: 300_000, presupuesto: 250_000 },
        { id: 2, nombre: 'Transporte', color: '#00f', total: 100_000, presupuesto: null },
      ],
    });
    assert.equal(r.balance, 600_000);
    assert.equal(r.porCategoria[0]?.participacion, 75);
    assert.equal(r.alertas.length, 1);
    assert.equal(r.alertas[0]?.estado, 'EXCEDIDO');
  });
});

describe('Jerarquía de errores', () => {
  test('cada subclase fija su código HTTP y sigue siendo AppError', () => {
    const e = new NoEncontradoError('Gasto');
    assert.ok(e instanceof AppError);
    assert.equal(e.status, 404);
    assert.equal(e.message, 'Gasto no encontrado');
    assert.equal(e.name, 'NoEncontradoError');
    assert.equal(new ProhibidoError().status, 403);
    assert.deepEqual(e.aRespuesta(), { error: { codigo: 'NO_ENCONTRADO', mensaje: 'Gasto no encontrado' } });
  });
});
