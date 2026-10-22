/* =============================================================
 * CONTENIDO DE LA PORTADA (rediseño)
 *
 * Lo que es de DISEÑO y no de la carta: qué platos se destacan y qué
 * datos cortos se muestran. La carta en sí (nombres, precios,
 * descripciones) sigue viniendo de `menu.ts` + Supabase: aquí solo hay
 * IDs, nunca precios ni nombres copiados.
 *
 * Todo lo de este archivo es real. Nada de cifras de relleno:
 *   · años, carne madurada y domicilios salen de "Nuestra historia" y
 *     "Contacto" (copy del cliente).
 *   · los métodos de pago son los mismos que ofrece el carrito.
 * ============================================================= */

import type { CategoriaId } from '@/types/menu';

/** "Favoritos de la casa": platos elegidos por el restaurante (con foto real). */
export const FAVORITOS: string[] = ['h-cheese-bacon', 'p-todo-terreno', 'h-montanera', 's-clasica'];

/** Datos cortos bajo los botones del hero. */
export const DATOS_HERO = [
  { icono: 'llama', titulo: '+11 años', texto: 'De tradición en Cajicá' },
  { icono: 'carne', titulo: 'Carne madurada', texto: 'Panes artesanales' },
  { icono: 'moto', titulo: 'Domicilios', texto: 'Por WhatsApp hasta 9:40 p.m.' },
] as const;

/** A qué categoría lleva el banner de combo (el combo aplica a hamburguesas y perros). */
export const CATEGORIA_COMBO: CategoriaId = 'hamburguesas';

/** Métodos de pago reales: los mismos que ofrece el formulario del carrito. */
export const METODOS_PAGO = ['Efectivo', 'Tarjeta', 'Transferencia'] as const;

export const CONTACTO = {
  direccion: 'Calle 11 A Sur #10-75 · Camino entrada Fagua, sector Canelón.',
  horario: 'Martes a Domingo · 1:00 PM – 10:00 PM.',
  horarioNota: 'Lunes cerrado — abrimos solo en lunes festivos.',
  domicilios: 'Por WhatsApp hasta las 9:40 PM.',
  instagram: 'https://instagram.com/elportoncajica',
  instagramUsuario: '@elportoncajica',
  mapa: 'https://maps.app.goo.gl/B1Yka6GRnqEvMZ6u6',
} as const;
