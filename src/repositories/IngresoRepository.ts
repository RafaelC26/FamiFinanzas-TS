import { MovimientoRepository } from './MovimientoRepository.js';
import { Ingreso } from '../dominio/Ingreso.js';
import type { EntradaIngreso } from '../utils/validacion.js';

interface FilaIngreso {
  id: number;
  familia_id: number;
  usuario_id: number;
  monto: number;
  fecha: string;
  fuente: string;
  descripcion: string;
  creado_en: string;
  usuario_nombre: string;
}

export class IngresoRepository extends MovimientoRepository<Ingreso, FilaIngreso> {
  protected override readonly tabla = 'ingresos';
  protected override readonly alias = 'i';
  protected override readonly select = 'SELECT i.*, u.nombre AS usuario_nombre FROM ingresos i JOIN usuarios u ON u.id = i.usuario_id';

  protected override mapear(i: FilaIngreso): Ingreso {
    return new Ingreso({
      id: i.id,
      monto: i.monto,
      fecha: i.fecha,
      fuente: i.fuente,
      descripcion: i.descripcion,
      usuario: { id: i.usuario_id, nombre: i.usuario_nombre },
      creadoEn: i.creado_en,
    });
  }

  crear(familiaId: number, usuarioId: number, { monto, fecha, fuente, descripcion }: EntradaIngreso): Ingreso {
    const { idInsertado } = this.ejecutar(
      'INSERT INTO ingresos (familia_id, usuario_id, monto, fecha, fuente, descripcion) VALUES (?, ?, ?, ?, ?, ?)',
      familiaId, usuarioId, monto, fecha, fuente, descripcion,
    );
    return this.buscar(idInsertado, familiaId) as Ingreso;
  }

  actualizar(id: number, familiaId: number, { monto, fecha, fuente, descripcion }: EntradaIngreso): Ingreso {
    this.ejecutar(
      'UPDATE ingresos SET monto = ?, fecha = ?, fuente = ?, descripcion = ? WHERE id = ? AND familia_id = ?',
      monto, fecha, fuente, descripcion, id, familiaId,
    );
    return this.buscar(id, familiaId) as Ingreso;
  }
}
