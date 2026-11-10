import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Busca la raíz del proyecto (la carpeta con package.json) subiendo desde este
 * archivo. Así las rutas a views/, public/ y openapi.yaml funcionan igual al
 * ejecutar el código transpilado desde dist/src/ que desde cualquier otra carpeta.
 */
function buscarRaiz(desde: string): string {
  let carpeta = desde;
  while (!existsSync(join(carpeta, 'package.json'))) {
    const padre = dirname(carpeta);
    if (padre === carpeta) throw new Error('No se encontró package.json');
    carpeta = padre;
  }
  return carpeta;
}

export const RAIZ_PROYECTO: string = buscarRaiz(dirname(fileURLToPath(import.meta.url)));

export const rutaProyecto = (...partes: string[]): string => join(RAIZ_PROYECTO, ...partes);
