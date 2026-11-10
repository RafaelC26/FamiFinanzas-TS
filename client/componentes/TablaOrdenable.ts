import { Componente } from '../nucleo/Componente.js';
import { buscarTodos } from '../nucleo/dom.js';

/** Tipos de columna que se pueden ordenar (atributo data-tipo del <th>). */
type TipoColumna = 'texto' | 'numero' | 'fecha';
type Direccion = 'ascending' | 'descending';

/** Un comparador por tipo: Record garantiza que no falte ninguno. */
const COMPARADORES: Readonly<Record<TipoColumna, (a: string, b: string) => number>> = {
  texto: (a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }),
  numero: (a, b) => Number(a) - Number(b),
  fecha: (a, b) => a.localeCompare(b), // AAAA-MM-DD se ordena como texto
};

const esTipoColumna = (v: string | undefined): v is TipoColumna => v === 'texto' || v === 'numero' || v === 'fecha';

/** Ordena las filas de <table data-ordenable> al hacer clic en un encabezado con data-tipo. */
export class TablaOrdenable extends Componente<HTMLTableElement> {
  montar(): void {
    const encabezados = buscarTodos<HTMLTableCellElement>('thead th', this.raiz);
    encabezados.forEach((th, indice) => {
      const tipo = th.dataset['tipo'];
      if (!esTipoColumna(tipo)) return;
      th.classList.add('ordenable');
      th.tabIndex = 0;
      th.setAttribute('aria-sort', 'none');
      const ordenar = (): void => this.ordenar(th, indice, tipo, encabezados);
      th.addEventListener('click', ordenar);
      th.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          ordenar();
        }
      });
    });
  }

  private ordenar(th: HTMLTableCellElement, indice: number, tipo: TipoColumna, todos: HTMLTableCellElement[]): void {
    const cuerpo = this.raiz.tBodies[0];
    if (!cuerpo) return;
    const direccion: Direccion = th.getAttribute('aria-sort') === 'ascending' ? 'descending' : 'ascending';
    todos.forEach((otro) => otro.setAttribute('aria-sort', 'none'));
    th.setAttribute('aria-sort', direccion);

    const valor = (fila: HTMLTableRowElement): string => {
      const celda = fila.cells[indice];
      return celda?.dataset['valor'] ?? celda?.textContent?.trim() ?? '';
    };
    const signo = direccion === 'ascending' ? 1 : -1;
    const filas = Array.from(cuerpo.rows).filter((f) => f.cells.length > 1); // ignora la fila "sin datos"
    filas.sort((a, b) => signo * COMPARADORES[tipo](valor(a), valor(b)));
    cuerpo.append(...filas);
  }
}
