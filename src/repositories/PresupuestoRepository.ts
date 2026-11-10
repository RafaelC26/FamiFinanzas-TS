import { RepositorioBase } from './RepositorioBase.js';
import { Presupuesto } from '../dominio/Presupuesto.js';
import type { EntradaPresupuesto } from '../utils/validacion.js';

interface FilaPresupuesto {
  id: number;
  familia_id: number;
  categoria_id: number;
  mes: string;
  monto_limite: number;
  categoria_nombre: string;
  categoria_color: string;
}

const SELECT = `SELECT p.*, c.nombre AS categoria_nombre, c.color AS categoria_color
  FROM presupuestos p JOIN categorias c ON c.id = p.categoria_id`;

export class PresupuestoRepository extends RepositorioBase<Presupuesto, FilaPresupuesto> {
  protected override mapear(p: FilaPresupuesto): Presupuesto {
    return new Presupuesto({
      id: p.id,
      mes: p.mes,
      montoLimite: p.monto_limite,
      categoria: { id: p.categoria_id, nombre: p.categoria_nombre, color: p.categoria_color },
    });
  }

  crear(familiaId: number, { categoriaId, mes, montoLimite }: EntradaPresupuesto): Presupuesto {
    const { idInsertado } = this.ejecutar(
      'INSERT INTO presupuestos (familia_id, categoria_id, mes, monto_limite) VALUES (?, ?, ?, ?)',
      familiaId, categoriaId, mes, montoLimite,
    );
    return this.buscar(idInsertado, familiaId) as Presupuesto;
  }

  buscar(id: number, familiaId: number): Presupuesto | null {
    return this.uno(`${SELECT} WHERE p.id = ? AND p.familia_id = ?`, id, familiaId);
  }

  buscarPorCategoriaMes(familiaId: number, categoriaId: number, mes: string): Presupuesto | null {
    return this.uno(`${SELECT} WHERE p.familia_id = ? AND p.categoria_id = ? AND p.mes = ?`, familiaId, categoriaId, mes);
  }

  listarPorMes(familiaId: number, mes: string): Presupuesto[] {
    return this.varios(`${SELECT} WHERE p.familia_id = ? AND p.mes = ? ORDER BY c.nombre`, familiaId, mes);
  }

  actualizar(id: number, familiaId: number, montoLimite: number): Presupuesto {
    this.ejecutar('UPDATE presupuestos SET monto_limite = ? WHERE id = ? AND familia_id = ?', montoLimite, id, familiaId);
    return this.buscar(id, familiaId) as Presupuesto;
  }

  eliminar(id: number, familiaId: number): void {
    this.ejecutar('DELETE FROM presupuestos WHERE id = ? AND familia_id = ?', id, familiaId);
  }
}
