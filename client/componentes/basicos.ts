import { Componente } from '../nucleo/Componente.js';
import { buscarTodos, crear } from '../nucleo/dom.js';

/** Pide confirmación antes de acciones destructivas: <form data-confirmar="¿Eliminar...?">. */
export class ConfirmacionAccion extends Componente<HTMLFormElement> {
  montar(): void {
    this.raiz.addEventListener('submit', (e: SubmitEvent) => {
      const mensaje = this.raiz.dataset['confirmar'] ?? '¿Confirmar la acción?';
      if (!window.confirm(mensaje)) e.preventDefault();
    });
  }
}

/** Menú desplegable en pantallas pequeñas: <button data-menu aria-controls="menu">. */
export class MenuMovil extends Componente<HTMLButtonElement> {
  montar(): void {
    const idMenu = this.raiz.getAttribute('aria-controls') ?? 'menu';
    const menu = document.getElementById(idMenu);
    if (!menu) return;
    this.raiz.addEventListener('click', () => {
      const abierto = menu.classList.toggle('abierto');
      this.raiz.setAttribute('aria-expanded', String(abierto));
    });
  }
}

/** Evita el doble envío de formularios deshabilitando sus botones al enviar. */
export class EnvioUnico extends Componente<HTMLFormElement> {
  montar(): void {
    this.raiz.addEventListener('submit', (e) => {
      if (e.defaultPrevented) return;
      buscarTodos<HTMLButtonElement>('button[type="submit"], button:not([type])', this.raiz).forEach((b) => {
        b.disabled = true;
      });
    });
  }
}

/** Los mensajes de éxito se cierran solos; todos tienen botón de cerrar. */
export class AvisoFlash extends Componente<HTMLDivElement> {
  static readonly DURACION_MS = 6000;

  montar(): void {
    const cerrar = crear('button', { className: 'alerta-cerrar', title: 'Cerrar', textContent: '×' });
    cerrar.type = 'button';
    cerrar.addEventListener('click', () => this.ocultar());
    this.raiz.append(cerrar);
    if (this.raiz.classList.contains('alerta-ok')) {
      window.setTimeout(() => this.ocultar(), AvisoFlash.DURACION_MS);
    }
  }

  private ocultar(): void {
    this.raiz.classList.add('alerta-saliendo');
    window.setTimeout(() => this.raiz.remove(), 300); // coincide con la transición CSS
  }
}
