import { RepositorioBase } from './RepositorioBase.js';
import { Familia } from '../dominio/Familia.js';

interface FilaFamilia {
  id: number;
  nombre: string;
  moneda: string;
  creado_en: string;
}

export class FamiliaRepository extends RepositorioBase<Familia, FilaFamilia> {
  protected override mapear(f: FilaFamilia): Familia {
    return new Familia({ id: f.id, nombre: f.nombre, moneda: f.moneda, creadoEn: f.creado_en });
  }

  crear(nombre: string, moneda = 'COP'): Familia {
    const { idInsertado } = this.ejecutar('INSERT INTO familias (nombre, moneda) VALUES (?, ?)', nombre, moneda);
    return this.buscarPorId(idInsertado) as Familia;
  }

  buscarPorId(id: number): Familia | null {
    return this.uno('SELECT * FROM familias WHERE id = ?', id);
  }
}
