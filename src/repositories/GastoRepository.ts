import { MovimientoRepository, type CriteriosMovimiento } from './MovimientoRepository.js';
import type { ClausulaWhere } from './RepositorioBase.js';
import { Gasto } from '../dominio/Gasto.js';
import type { MetodoPago } from '../dominio/enums.js';
import type { EntradaGasto } from '../utils/validacion.js';

interface FilaGasto {
  id: number;
  familia_id: number;
  usuario_id: number;
  categoria_id: number;
  monto: number;
  fecha: string;
  descripcion: string;
  metodo_pago: MetodoPago;
  creado_en: string;
  categoria_nombre: string;
  categoria_color: string;
  usuario_nombre: string;
}

export class GastoRepository extends MovimientoRepository<Gasto, FilaGasto> {
  protected override readonly tabla = 'gastos';
  protected override readonly alias = 'g';
  protected override readonly select = `
    SELECT g.*, c.nombre AS categoria_nombre, c.color AS categoria_color, u.nombre AS usuario_nombre
    FROM gastos g
    JOIN categorias c ON c.id = g.categoria_id
    JOIN usuarios u ON u.id = g.usuario_id`;

  protected override mapear(g: FilaGasto): Gasto {
    return new Gasto({
      id: g.id,
      monto: g.monto,
      fecha: g.fecha,
      descripcion: g.descripcion,
      metodoPago: g.metodo_pago,
      categoria: { id: g.categoria_id, nombre: g.categoria_nombre, color: g.categoria_color },
      usuario: { id: g.usuario_id, nombre: g.usuario_nombre },
      creadoEn: g.creado_en,
    });
  }

  /** Los gastos además se filtran por categoría. */
  protected override filtrosAdicionales({ categoriaId }: CriteriosMovimiento): ClausulaWhere {
    return categoriaId ? { where: 'g.categoria_id = ?', params: [categoriaId] } : { where: '', params: [] };
  }

  crear(familiaId: number, usuarioId: number, { monto, fecha, categoriaId, descripcion, metodoPago }: EntradaGasto): Gasto {
    const { idInsertado } = this.ejecutar(
      'INSERT INTO gastos (familia_id, usuario_id, categoria_id, monto, fecha, descripcion, metodo_pago) VALUES (?, ?, ?, ?, ?, ?, ?)',
      familiaId, usuarioId, categoriaId, monto, fecha, descripcion, metodoPago,
    );
    return this.buscar(idInsertado, familiaId) as Gasto;
  }

  actualizar(id: number, familiaId: number, { monto, fecha, categoriaId, descripcion, metodoPago }: EntradaGasto): Gasto {
    this.ejecutar(
      'UPDATE gastos SET monto = ?, fecha = ?, categoria_id = ?, descripcion = ?, metodo_pago = ? WHERE id = ? AND familia_id = ?',
      monto, fecha, categoriaId, descripcion, metodoPago, id, familiaId,
    );
    return this.buscar(id, familiaId) as Gasto;
  }

  totalCategoriaMes(familiaId: number, categoriaId: number, mes: string): number {
    return this.fila<{ total: number }>(
      'SELECT COALESCE(SUM(monto), 0) AS total FROM gastos WHERE familia_id = ? AND categoria_id = ? AND fecha BETWEEN ? AND ?',
      familiaId, categoriaId, `${mes}-01`, `${mes}-31`,
    )?.total ?? 0;
  }
}
