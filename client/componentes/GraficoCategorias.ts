import { Componente } from '../nucleo/Componente.js';
import { crear, leerJson } from '../nucleo/dom.js';
import { formatoMoneda } from '../nucleo/formato.js';
import type { ResumenMensualDTO, TotalCategoriaDTO } from '../../src/shared/contratos.js';

/** Un sector del gráfico con sus ángulos calculados. */
interface Sector {
  categoria: TotalCategoriaDTO;
  inicio: number;
  fin: number;
}

const DOS_PI = Math.PI * 2;

/**
 * Gráfico de dona con la distribución del gasto del mes por categoría.
 * Lee el resumen que el servidor incrusta como JSON (<script id="datos-resumen">),
 * tipado con el mismo ResumenMensualDTO que usa el backend.
 *
 * Uso: <canvas data-grafico="datos-resumen">
 */
export class GraficoCategorias extends Componente<HTMLCanvasElement> {
  #sectores: Sector[] = [];
  #total = 0;

  montar(): void {
    const resumen = leerJson<ResumenMensualDTO>(this.raiz.dataset['grafico'] ?? 'datos-resumen');
    const conGasto = resumen?.porCategoria.filter((c) => c.total > 0) ?? [];
    if (!resumen || conGasto.length === 0) {
      this.raiz.hidden = true;
      return;
    }
    this.#total = resumen.totalGastos;
    this.#sectores = this.calcularSectores(conGasto);
    this.raiz.setAttribute('role', 'img');
    this.raiz.setAttribute('aria-label', `Distribución del gasto: ${conGasto.map((c) => `${c.nombre} ${c.participacion}%`).join(', ')}`);
    this.dibujar(null);
    this.agregarLeyenda();
    this.raiz.addEventListener('mousemove', (e) => this.dibujar(this.sectorEn(e)));
    this.raiz.addEventListener('mouseleave', () => this.dibujar(null));
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => this.dibujar(null));
  }

  private calcularSectores(categorias: TotalCategoriaDTO[]): Sector[] {
    const suma = categorias.reduce((s, c) => s + c.total, 0);
    let angulo = -Math.PI / 2;
    return categorias.map((categoria) => {
      const inicio = angulo;
      angulo += (categoria.total / suma) * DOS_PI;
      return { categoria, inicio, fin: angulo };
    });
  }

  /** Detecta qué sector está bajo el puntero (coordenadas polares). */
  private sectorEn(e: MouseEvent): Sector | null {
    const caja = this.raiz.getBoundingClientRect();
    const x = e.clientX - caja.left - caja.width / 2;
    const y = e.clientY - caja.top - caja.height / 2;
    const radio = Math.hypot(x, y);
    const exterior = Math.min(caja.width, caja.height) / 2;
    if (radio > exterior || radio < exterior * 0.58) return null;
    let a = Math.atan2(y, x);
    if (a < -Math.PI / 2) a += DOS_PI;
    return this.#sectores.find((s) => a >= s.inicio && a < s.fin) ?? null;
  }

  private dibujar(resaltado: Sector | null): void {
    const ctx = this.raiz.getContext('2d');
    if (!ctx) return;
    const lado = this.raiz.clientWidth || 220;
    const escala = window.devicePixelRatio || 1;
    this.raiz.width = lado * escala;
    this.raiz.height = lado * escala;
    ctx.setTransform(escala, 0, 0, escala, 0, 0);
    ctx.clearRect(0, 0, lado, lado);

    const centro = lado / 2;
    const exterior = centro - 6;
    const interior = exterior * 0.62;
    for (const s of this.#sectores) {
      const r = s === resaltado ? exterior + 5 : exterior;
      ctx.beginPath();
      ctx.arc(centro, centro, r, s.inicio, s.fin);
      ctx.arc(centro, centro, interior, s.fin, s.inicio, true);
      ctx.closePath();
      ctx.fillStyle = s.categoria.color;
      ctx.globalAlpha = resaltado && s !== resaltado ? 0.45 : 1;
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    const estilos = getComputedStyle(document.documentElement);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = estilos.getPropertyValue('--suave').trim() || '#6b7280';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(resaltado ? resaltado.categoria.nombre : 'Total del mes', centro, centro - 12);
    ctx.fillStyle = estilos.getPropertyValue('--texto').trim() || '#1f2937';
    ctx.font = '600 15px system-ui, sans-serif';
    ctx.fillText(formatoMoneda(resaltado ? resaltado.categoria.total : this.#total), centro, centro + 8);
    if (resaltado) {
      ctx.font = '12px system-ui, sans-serif';
      ctx.fillText(`${resaltado.categoria.participacion}%`, centro, centro + 27);
    }
  }

  private agregarLeyenda(): void {
    const lista = crear('ul', { className: 'leyenda' });
    for (const { categoria } of this.#sectores) {
      const punto = crear('i', { className: 'punto' });
      punto.style.setProperty('--c', categoria.color);
      lista.append(crear('li', {}, [punto, `${categoria.nombre} · ${categoria.participacion}%`]));
    }
    this.raiz.insertAdjacentElement('afterend', lista);
  }
}
