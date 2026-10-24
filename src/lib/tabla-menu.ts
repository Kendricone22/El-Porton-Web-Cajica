/* =============================================================
 * VISTA "TABLA" DEL MENÚ — lógica pura
 *
 * La dueña trabaja con un Excel (Código, Nombre, Precio, Descripción…).
 * Esta vista le da ese mismo formato dentro del panel: una fila por plato,
 * todo editable, y se guarda junto. Aquí solo hay cálculos (sin red) para
 * poder probarlos; la pantalla está en componentes/admin/TablaMenu.tsx.
 *
 * Los precios se guardan como TEXTO mientras se editan (para dejar escribir
 * "15.000" o "$ 15000") y se convierten a número al validar.
 * ============================================================= */

import { aPrecio } from './precios-pos';

type Opcion = { label: string; price: number };
export type DatosFila = { name?: string; desc?: string; options?: Opcion[]; available?: boolean; [k: string]: unknown };

export type Borrador = { name: string; desc: string; precios: string[]; available: boolean };

export const borradorDe = (data: DatosFila, available: boolean): Borrador => ({
  name: data.name ?? '',
  desc: data.desc ?? '',
  precios: (data.options ?? []).map((o) => String(o.price)),
  available,
});

/** Qué campos cambió el usuario respecto a lo guardado. */
export function camposCambiados(data: DatosFila, available: boolean, b: Borrador): Set<string> {
  const c = new Set<string>();
  if (b.name.trim() !== (data.name ?? '').trim()) c.add('name');
  if (b.desc.trim() !== (data.desc ?? '').trim()) c.add('desc');
  if (b.available !== available) c.add('available');
  (data.options ?? []).forEach((o, i) => {
    if (aPrecio(b.precios[i]) !== o.price) c.add('precio:' + i);
  });
  return c;
}

/** Errores que impiden guardar una fila. Vacío = se puede guardar. */
export function erroresDe(b: Borrador, etiquetas: string[]): string[] {
  const e: string[] = [];
  if (!b.name.trim()) e.push('El nombre no puede quedar vacío');
  b.precios.forEach((p, i) => {
    if (aPrecio(p) === null) e.push(`Precio inválido en "${etiquetas[i] ?? i + 1}"`);
  });
  return e;
}

/**
 * Lo que se guarda: todo lo que ya tenía el plato (foto, combo, sabores…)
 * más el nombre, la descripción, los precios y la disponibilidad nuevos.
 */
export function dataNueva(data: DatosFila, b: Borrador): DatosFila {
  return {
    ...data,
    name: b.name.trim(),
    desc: b.desc.trim(),
    available: b.available,
    options: (data.options ?? []).map((o, i) => ({ ...o, price: aPrecio(b.precios[i]) ?? o.price })),
  };
}

export type Ajuste = { tipo: 'porcentaje' | 'monto'; valor: number };

/**
 * Sube o baja un precio. Redondea a la centena (como se fijan los precios
 * en Colombia: $15.700, no $15.687) y nunca deja un precio por debajo de $100.
 */
export function ajustarPrecio(precio: number, a: Ajuste): number {
  const bruto = a.tipo === 'porcentaje' ? precio * (1 + a.valor / 100) : precio + a.valor;
  return Math.max(100, Math.round(bruto / 100) * 100);
}

/** Normaliza para buscar sin tildes ni mayúsculas. */
export const paraBuscar = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
