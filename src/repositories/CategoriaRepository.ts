import { RepositorioBase } from './RepositorioBase.js';
import { Categoria } from '../dominio/Categoria.js';

interface FilaCategoria {
  id: number;
  familia_id: number;
  nombre: string;
  color: string;
  activo: number;
}

export interface DatosNuevaCategoria {
  nombre: string;
  color: string;
}

export interface OpcionesListadoCategorias {
  incluirInactivas?: boolean;
}

export class CategoriaRepository extends RepositorioBase<Categoria, FilaCategoria> {
  protected override mapear(c: FilaCategoria): Categoria {
    return new Categoria({ id: c.id, nombre: c.nombre, color: c.color, activo: Boolean(c.activo) });
  }

  crear(familiaId: number, { nombre, color }: DatosNuevaCategoria): Categoria {
    const { idInsertado } = this.ejecutar('INSERT INTO categorias (familia_id, nombre, color) VALUES (?, ?, ?)', familiaId, nombre, color);
    return this.buscar(idInsertado, familiaId) as Categoria;
  }

  listar(familiaId: number, { incluirInactivas = false }: OpcionesListadoCategorias = {}): Categoria[] {
    const sql = `SELECT * FROM categorias WHERE familia_id = ? ${incluirInactivas ? '' : 'AND activo = 1'} ORDER BY nombre`;
    return this.varios(sql, familiaId);
  }

  buscar(id: number, familiaId: number): Categoria | null {
    return this.uno('SELECT * FROM categorias WHERE id = ? AND familia_id = ?', id, familiaId);
  }

  buscarPorNombre(nombre: string, familiaId: number): Categoria | null {
    return this.uno('SELECT * FROM categorias WHERE nombre = ? COLLATE NOCASE AND familia_id = ?', nombre, familiaId);
  }

  actualizar(id: number, familiaId: number, { nombre, color }: DatosNuevaCategoria): Categoria {
    this.ejecutar('UPDATE categorias SET nombre = ?, color = ?, activo = 1 WHERE id = ? AND familia_id = ?', nombre, color, id, familiaId);
    return this.buscar(id, familiaId) as Categoria;
  }

  tieneMovimientos(id: number): boolean {
    return Boolean(this.fila('SELECT 1 AS existe FROM gastos WHERE categoria_id = ? LIMIT 1', id));
  }

  desactivar(id: number): void {
    this.ejecutar('UPDATE categorias SET activo = 0 WHERE id = ?', id);
  }

  eliminar(id: number): void {
    this.ejecutar('DELETE FROM categorias WHERE id = ?', id);
  }
}
