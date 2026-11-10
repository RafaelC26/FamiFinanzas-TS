/**
 * Utilidades DOM tipadas. `querySelector` en JS devuelve un Element genérico;
 * aquí el genérico <T> indica qué tipo de elemento se espera y `exigir` lo
 * comprueba con instanceof, así el resto del código usa .value, .checked, etc.
 * sin errores silenciosos.
 */

export function buscar<T extends Element = HTMLElement>(selector: string, raiz: ParentNode = document): T | null {
  return raiz.querySelector<T>(selector);
}

export function buscarTodos<T extends Element = HTMLElement>(selector: string, raiz: ParentNode = document): T[] {
  return Array.from(raiz.querySelectorAll<T>(selector));
}

/** Constructor de un tipo de elemento (HTMLInputElement, HTMLCanvasElement, ...). */
type ClaseElemento<T extends Element> = { new (): T; prototype: T };

/** Busca un elemento y verifica su tipo real en ejecución; devuelve null si no coincide. */
export function buscarComo<T extends Element>(selector: string, tipo: ClaseElemento<T>, raiz: ParentNode = document): T | null {
  const el = raiz.querySelector(selector);
  return el instanceof tipo ? el : null;
}

/** Igual que buscarComo, pero lanza un error claro si el elemento falta (errores de maquetación). */
export function exigir<T extends Element>(selector: string, tipo: ClaseElemento<T>, raiz: ParentNode = document): T {
  const el = buscarComo(selector, tipo, raiz);
  if (!el) throw new Error(`Falta el elemento ${selector} (${tipo.name})`);
  return el;
}

/** Lee datos que el servidor incrusta como <script type="application/json" id="...">. */
export function leerJson<T>(id: string): T | null {
  const nodo = document.getElementById(id);
  if (!nodo?.textContent) return null;
  try {
    return JSON.parse(nodo.textContent) as T;
  } catch {
    return null;
  }
}

/** Crea un elemento con propiedades tipadas según la etiqueta (p. ej. 'li' → HTMLLIElement). */
export function crear<K extends keyof HTMLElementTagNameMap>(
  etiqueta: K,
  propiedades: Partial<Pick<HTMLElementTagNameMap[K], 'className' | 'textContent' | 'title'>> = {},
  hijos: Array<Node | string> = [],
): HTMLElementTagNameMap[K] {
  const el = document.createElement(etiqueta);
  Object.assign(el, propiedades);
  el.append(...hijos);
  return el;
}
