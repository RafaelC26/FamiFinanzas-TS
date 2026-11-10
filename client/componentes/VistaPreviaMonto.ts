import { Componente } from '../nucleo/Componente.js';
import { crear } from '../nucleo/dom.js';
import { aNumero, formatoMoneda } from '../nucleo/formato.js';

/** Muestra el monto escrito con formato de pesos colombianos: <input data-moneda>. */
export class VistaPreviaMonto extends Componente<HTMLInputElement> {
  readonly #salida = crear('small', { className: 'vista-moneda' });

  montar(): void {
    this.#salida.setAttribute('aria-live', 'polite');
    this.raiz.insertAdjacentElement('afterend', this.#salida);
    this.raiz.addEventListener('input', () => this.actualizar());
    this.actualizar();
  }

  private actualizar(): void {
    const valor = aNumero(this.raiz.value);
    this.#salida.textContent = valor !== null && valor > 0 ? formatoMoneda(valor) : '';
  }
}
