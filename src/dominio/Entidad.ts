import type { Serializable } from './interfaces.js';

/**
 * Raíz de la jerarquía de clases del dominio. Toda entidad persistida tiene un
 * identificador inmutable y sabe serializarse a su DTO.
 *
 * `abstract`: no se puede instanciar directamente (new Entidad() no compila).
 * `TDTO` (genérico): cada subclase declara la forma exacta de su JSON.
 */
export abstract class Entidad<TDTO> implements Serializable<TDTO> {
  protected constructor(public readonly id: number) {}

  abstract toJSON(): TDTO;

  /** Dos entidades son iguales si son del mismo tipo y tienen el mismo id. */
  esIgualA(otra: Entidad<unknown>): boolean {
    return this.constructor === otra.constructor && this.id === otra.id;
  }
}
