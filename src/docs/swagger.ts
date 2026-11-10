import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import type { JsonObject } from 'swagger-ui-express';
import { rutaProyecto } from '../utils/rutas.js';

/** Especificación OpenAPI 3 (el YAML no se transpila: se lee desde src/docs/). */
export const especificacionOpenApi = parse(readFileSync(rutaProyecto('src', 'docs', 'openapi.yaml'), 'utf8')) as JsonObject;
