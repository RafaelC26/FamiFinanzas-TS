import { Componente } from '../nucleo/Componente.js';
import { buscarComo } from '../nucleo/dom.js';
import { aNumero, formatoMoneda, mesDeFecha } from '../nucleo/formato.js';
import { clienteHttp } from '../nucleo/ClienteHttp.js';
import { ETIQUETA_ESTADO, proyectar } from '../dominio/presupuesto.js';
import type { EjecucionPresupuestoDTO } from '../../src/shared/contratos.js';

/** Datos del gasto original cuando el formulario es de edición (para no contarlo dos veces). */
interface GastoOriginal {
  monto: number;
  categoriaId: number;
  mes: string;
}

/**
 * Antes de guardar un gasto, consulta al servidor (GET /datos/presupuestos)
 * el presupuesto de la categoría y avisa cómo quedaría: "Alimentación quedaría
 * en 92 % (Alerta)". Anticipa en el navegador la alerta RF-10.
 *
 * Uso: <form data-simulador> con campos monto, fecha, categoriaId y un <output data-simulacion>.
 */
export class SimuladorPresupuesto extends Componente<HTMLFormElement> {
  #monto: HTMLInputElement | null = null;
  #fecha: HTMLInputElement | null = null;
  #categoria: HTMLSelectElement | null = null;
  #salida: HTMLOutputElement | null = null;
  #consulta = 0; // descarta respuestas viejas si el usuario sigue escribiendo

  montar(): void {
    this.#monto = buscarComo('input[name="monto"]', HTMLInputElement, this.raiz);
    this.#fecha = buscarComo('input[name="fecha"]', HTMLInputElement, this.raiz);
    this.#categoria = buscarComo('select[name="categoriaId"]', HTMLSelectElement, this.raiz);
    this.#salida = buscarComo('output[data-simulacion]', HTMLOutputElement, this.raiz);
    if (!this.#monto || !this.#fecha || !this.#categoria || !this.#salida) return;

    for (const campo of [this.#monto, this.#fecha, this.#categoria]) {
      campo.addEventListener('change', () => void this.simular());
    }
    this.#monto.addEventListener('input', () => void this.simular());
    void this.simular();
  }

  private get original(): GastoOriginal | null {
    const { montoOriginal, categoriaOriginal, mesOriginal } = this.raiz.dataset;
    if (!montoOriginal || !categoriaOriginal || !mesOriginal) return null;
    return { monto: Number(montoOriginal), categoriaId: Number(categoriaOriginal), mes: mesOriginal };
  }

  private async simular(): Promise<void> {
    const monto = aNumero(this.#monto?.value ?? '');
    const mes = mesDeFecha(this.#fecha?.value ?? '');
    const categoriaId = Number(this.#categoria?.value);
    if (monto === null || monto <= 0 || mes === null || !categoriaId) return this.ocultar();

    const consulta = ++this.#consulta;
    const r = await clienteHttp.obtener<EjecucionPresupuestoDTO[]>('/datos/presupuestos', { mes });
    if (consulta !== this.#consulta) return; // llegó una respuesta más nueva
    if (!r.ok) return this.ocultar();

    const presupuesto = r.datos.find((p) => p.categoria.id === categoriaId);
    if (!presupuesto) return this.mostrar('Esta categoría no tiene presupuesto para ese mes.', 'SIN');

    const o = this.original;
    const yaContado = o && o.categoriaId === categoriaId && o.mes === mes ? o.monto : 0;
    const p = proyectar(presupuesto.gastado - yaContado, monto, presupuesto.montoLimite);
    const texto =
      `Con este gasto, ${presupuesto.categoria.nombre} quedaría en ${p.porcentaje}% ` +
      `(${ETIQUETA_ESTADO[p.estado]}) · disponible ${formatoMoneda(p.disponible)} de ${formatoMoneda(presupuesto.montoLimite)}`;
    this.mostrar(texto, p.estado);
  }

  private mostrar(texto: string, estado: string): void {
    if (!this.#salida) return;
    this.#salida.textContent = texto;
    this.#salida.className = `simulacion estado-${estado}`;
    this.#salida.hidden = false;
  }

  private ocultar(): void {
    if (this.#salida) this.#salida.hidden = true;
  }
}
