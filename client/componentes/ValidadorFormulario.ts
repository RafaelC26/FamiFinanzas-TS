import { Componente } from '../nucleo/Componente.js';
import { buscarTodos, crear } from '../nucleo/dom.js';
import { aNumero } from '../nucleo/formato.js';

type Campo = HTMLInputElement | HTMLSelectElement;

/** Una regla de validación: si `valida` devuelve false se muestra `mensaje`. */
interface Regla {
  mensaje: string;
  valida: (valor: string) => boolean;
}

const MONTO_MAXIMO = 10_000_000_000;

const montoPositivo: Regla[] = [
  { mensaje: 'Ingrese un monto numérico', valida: (v) => aNumero(v) !== null },
  { mensaje: 'El monto debe ser mayor que cero', valida: (v) => (aNumero(v) ?? 0) > 0 },
  { mensaje: 'El monto es demasiado alto', valida: (v) => (aNumero(v) ?? 0) <= MONTO_MAXIMO },
];

/**
 * Reglas por nombre de campo, iguales a los esquemas zod del servidor
 * (src/utils/validacion.ts). El cliente da retroalimentación inmediata;
 * el servidor sigue siendo la validación definitiva.
 */
const REGLAS: Readonly<Record<string, readonly Regla[]>> = {
  monto: montoPositivo,
  montoLimite: montoPositivo,
  fecha: [
    { mensaje: 'La fecha debe tener formato AAAA-MM-DD', valida: (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) },
    { mensaje: 'La fecha no es válida', valida: (v) => !Number.isNaN(Date.parse(v)) },
  ],
  fuente: [{ mensaje: 'La fuente debe tener al menos 2 caracteres', valida: (v) => v.trim().length >= 2 }],
  descripcion: [{ mensaje: 'Máximo 200 caracteres', valida: (v) => v.trim().length <= 200 }],
};

/** Valida en vivo los formularios marcados con data-validar y bloquea el envío si hay errores. */
export class ValidadorFormulario extends Componente<HTMLFormElement> {
  readonly #mensajes = new Map<Campo, HTMLElement>();

  montar(): void {
    const campos = buscarTodos<Campo>('input[name], select[name]', this.raiz).filter((c) => c.name in REGLAS);
    for (const campo of campos) {
      campo.addEventListener('blur', () => this.validarCampo(campo));
      campo.addEventListener('input', () => {
        if (campo.getAttribute('aria-invalid') === 'true') this.validarCampo(campo);
      });
    }
    this.raiz.addEventListener('submit', (e) => {
      const errores = campos.filter((c) => !this.validarCampo(c));
      if (errores.length > 0) {
        e.preventDefault();
        errores[0]?.focus();
      }
    });
  }

  /** Devuelve true si el campo cumple todas sus reglas. */
  private validarCampo(campo: Campo): boolean {
    const reglas = REGLAS[campo.name] ?? [];
    const opcional = !campo.required && campo.value === '';
    const fallo = opcional ? undefined : reglas.find((r) => !r.valida(campo.value));
    this.mostrar(campo, fallo?.mensaje ?? null);
    return fallo === undefined;
  }

  private mostrar(campo: Campo, mensaje: string | null): void {
    let nodo = this.#mensajes.get(campo);
    if (!nodo) {
      nodo = crear('small', { className: 'error-campo' });
      nodo.setAttribute('role', 'alert');
      campo.insertAdjacentElement('afterend', nodo);
      this.#mensajes.set(campo, nodo);
    }
    nodo.textContent = mensaje ?? '';
    nodo.hidden = mensaje === null;
    campo.setAttribute('aria-invalid', String(mensaje !== null));
  }
}
