/**
 * Clase base de los componentes del frontend. Cada componente envuelve un
 * elemento raíz del HTML que genera EJS y le agrega comportamiento.
 *
 * El genérico E fija el tipo del elemento raíz: un componente de formulario
 * recibe un HTMLFormElement y puede usar .elements, .reset(), etc. con autocompletado.
 */
export abstract class Componente<E extends HTMLElement = HTMLElement> {
  constructor(protected readonly raiz: E) {}

  /** Conecta los eventos del componente. */
  abstract montar(): void;
}

/** Tipo de "la clase" de un componente (su constructor), usado para montarlos de forma genérica. */
export type ClaseComponente<E extends HTMLElement> = new (raiz: E) => Componente<E>;

/**
 * Crea y monta una instancia de `Clase` por cada elemento que coincide con el selector.
 * Devuelve cuántos componentes se montaron.
 */
export function montarTodos<E extends HTMLElement>(selector: string, Clase: ClaseComponente<E>): number {
  const elementos = Array.from(document.querySelectorAll<E>(selector));
  for (const el of elementos) {
    try {
      new Clase(el).montar();
    } catch (err) {
      // Un componente que falla no debe romper los demás (mejora progresiva).
      console.error(`No se pudo montar ${Clase.name}`, err);
    }
  }
  return elementos.length;
}
