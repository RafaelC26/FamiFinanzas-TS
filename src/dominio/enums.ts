/**
 * Enumeraciones del dominio. En la versión JS eran strings sueltos ('ADMIN',
 * 'EXCEDIDO'...) repetidos en varios archivos; un error de escritura solo se
 * descubría en ejecución. Con `enum` el compilador valida cada uso.
 */

export enum Rol {
  ADMIN = 'ADMIN',
  MIEMBRO = 'MIEMBRO',
}

export enum MetodoPago {
  EFECTIVO = 'EFECTIVO',
  TARJETA_DEBITO = 'TARJETA_DEBITO',
  TARJETA_CREDITO = 'TARJETA_CREDITO',
  TRANSFERENCIA = 'TRANSFERENCIA',
}

export enum EstadoPresupuesto {
  OK = 'OK',
  ALERTA = 'ALERTA',
  EXCEDIDO = 'EXCEDIDO',
  SIN_PRESUPUESTO = 'SIN_PRESUPUESTO',
}

/**
 * `Record<Enum, string>` obliga a que existan TODAS las claves: si mañana se
 * agrega un método de pago, este objeto deja de compilar hasta darle nombre.
 */
export const NOMBRES_METODO: Readonly<Record<MetodoPago, string>> = {
  [MetodoPago.EFECTIVO]: 'Efectivo',
  [MetodoPago.TARJETA_DEBITO]: 'Tarjeta débito',
  [MetodoPago.TARJETA_CREDITO]: 'Tarjeta crédito',
  [MetodoPago.TRANSFERENCIA]: 'Transferencia',
};

export const ETIQUETA_ESTADO: Readonly<Record<EstadoPresupuesto, string>> = {
  [EstadoPresupuesto.OK]: 'En rango',
  [EstadoPresupuesto.ALERTA]: 'Alerta',
  [EstadoPresupuesto.EXCEDIDO]: 'Excedido',
  [EstadoPresupuesto.SIN_PRESUPUESTO]: 'Sin presupuesto',
};

export const METODOS_PAGO: readonly MetodoPago[] = Object.values(MetodoPago);
export const ROLES: readonly Rol[] = Object.values(Rol);
