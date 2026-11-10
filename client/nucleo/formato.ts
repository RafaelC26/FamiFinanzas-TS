const moneda = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

export const formatoMoneda = (valor: number): string => moneda.format(valor);

/** '2026-11-09' → '2026-11'. Devuelve null si la fecha no tiene el formato esperado. */
export function mesDeFecha(fecha: string): string | null {
  return /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? fecha.slice(0, 7) : null;
}

/** Convierte el texto de un input a número; null si está vacío o no es numérico. */
export function aNumero(texto: string): number | null {
  if (texto.trim() === '') return null;
  const n = Number(texto);
  return Number.isFinite(n) ? n : null;
}
