/* =============================================================
 * INICIO DEL PANEL — cálculos puros (sin red), para poder probarlos
 *
 * Todo se calcula con la hora de Bogotá: el "día" del negocio es el de
 * Cajicá, no el del navegador ni el del servidor (que corre en UTC).
 * ============================================================= */

const ZONA = 'America/Bogota';
/** Bogotá no tiene horario de verano: siempre UTC−5. */
const DESFASE_HORAS = 5;

const fmtFecha = new Intl.DateTimeFormat('en-CA', { timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit' });

/** "2026-10-23": la fecha en Bogotá de un instante. */
export function fechaBogota(fecha: Date | string): string {
  return fmtFecha.format(typeof fecha === 'string' ? new Date(fecha) : fecha);
}

/** Instante en que empieza (00:00 en Bogotá) el día `desplazamiento` respecto a `ahora`. */
export function inicioDiaBogota(desplazamiento: number, ahora: Date = new Date()): Date {
  const [y, m, d] = fechaBogota(ahora).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + desplazamiento, DESFASE_HORAS));
}

/**
 * Variación porcentual de hoy frente a ayer, redondeada.
 * `null` si ayer fue 0: "infinito por ciento" no le dice nada a nadie.
 */
export function variacion(hoy: number, ayer: number): number | null {
  if (!ayer) return null;
  return Math.round(((hoy - ayer) / ayer) * 100);
}

type PuntoSerie = { inicio: string; ingreso: number; pedidos: number };

export type Kpis = {
  ventas: { hoy: number; ayer: number };
  pedidos: { hoy: number; ayer: number };
  ticket: { hoy: number; ayer: number };
};

/** Los indicadores del día salen de los dos últimos puntos de ventas_serie (ayer, hoy). */
export function kpisDeSerie(serie: PuntoSerie[]): Kpis {
  const hoy = serie[serie.length - 1] ?? { ingreso: 0, pedidos: 0 };
  const ayer = serie[serie.length - 2] ?? { ingreso: 0, pedidos: 0 };
  const ticket = (p: { ingreso: number; pedidos: number }) =>
    p.pedidos ? Math.round(Number(p.ingreso) / Number(p.pedidos)) : 0;
  return {
    ventas: { hoy: Number(hoy.ingreso), ayer: Number(ayer.ingreso) },
    pedidos: { hoy: Number(hoy.pedidos), ayer: Number(ayer.pedidos) },
    ticket: { hoy: ticket(hoy), ayer: ticket(ayer) },
  };
}

type PedidoMin = { customer_phone: string; created_at: string; status: string };

/**
 * Clientes distintos de un día: se compara por los DÍGITOS del teléfono
 * ("313 821 4752" y "3138214752" son la misma persona). Los cancelados
 * no cuentan, igual que en las ventas.
 */
export function clientesUnicos(pedidos: PedidoMin[], dia: string): number {
  const vistos = new Set<string>();
  for (const p of pedidos) {
    if (p.status === 'cancelado') continue;
    if (fechaBogota(p.created_at) !== dia) continue;
    const tel = (p.customer_phone || '').replace(/\D/g, '').replace(/^57(?=\d{10}$)/, '');
    if (tel) vistos.add(tel);
  }
  return vistos.size;
}

/* -------------------------------------------------------------
 * UN DÍA CONCRETO (el calendario del panel)
 * ----------------------------------------------------------- */

/** "2026-10-23" → el intervalo [desde, hasta) de ese día en Bogotá. */
export function rangoDia(dia: string): { desde: Date; hasta: Date } {
  const [y, m, d] = dia.split('-').map(Number);
  return {
    desde: new Date(Date.UTC(y, m - 1, d, DESFASE_HORAS)),
    hasta: new Date(Date.UTC(y, m - 1, d + 1, DESFASE_HORAS)),
  };
}

/** "2026-11-01" → "2026-10-31". */
export function diaAnterior(dia: string): string {
  return fechaBogota(new Date(rangoDia(dia).desde.getTime() - 1));
}

type PedidoDia = PedidoMin & { subtotal: number; items?: { name: string; cat?: string; qty: number; unitPrice?: number }[] | null };

export type ResumenDia = { ventas: number; pedidos: number; ticket: number; clientes: number };

/** Indicadores de un día con el mismo criterio que ventas_serie: los cancelados no cuentan. */
export function resumenDia(pedidos: PedidoDia[], dia: string): ResumenDia {
  const validos = pedidos.filter((p) => p.status !== 'cancelado' && fechaBogota(p.created_at) === dia);
  const ventas = validos.reduce((s, p) => s + Number(p.subtotal || 0), 0);
  return {
    ventas,
    pedidos: validos.length,
    ticket: validos.length ? Math.round(ventas / validos.length) : 0,
    clientes: clientesUnicos(pedidos, dia),
  };
}

/** Productos más pedidos de un día, igual que ventas_top: unidades × precio unitario guardado. */
export function topDelDia(
  pedidos: PedidoDia[],
  dia: string,
): { producto: string; categoria: string; unidades: number; ingreso: number }[] {
  const porNombre = new Map<string, { producto: string; categoria: string; unidades: number; ingreso: number }>();
  for (const p of pedidos) {
    if (p.status === 'cancelado' || fechaBogota(p.created_at) !== dia) continue;
    for (const it of p.items ?? []) {
      const nombre = it.name || '(sin nombre)';
      const qty = Number(it.qty) || 1;
      const fila = porNombre.get(nombre) ?? { producto: nombre, categoria: it.cat ?? '', unidades: 0, ingreso: 0 };
      fila.unidades += qty;
      fila.ingreso += qty * (Number(it.unitPrice) || 0);
      porNombre.set(nombre, fila);
    }
  }
  return [...porNombre.values()].sort((a, b) => b.unidades - a.unidades || b.ingreso - a.ingreso);
}

/** "Hace 3 minutos", "Hace 2 horas", "Hace 5 días". */
export function haceCuanto(iso: string, ahora: Date = new Date()): string {
  const seg = Math.max(0, Math.round((ahora.getTime() - new Date(iso).getTime()) / 1000));
  if (seg < 60) return 'Hace un momento';
  const min = Math.round(seg / 60);
  if (min < 60) return `Hace ${min} ${min === 1 ? 'minuto' : 'minutos'}`;
  const h = Math.round(min / 60);
  if (h < 24) return `Hace ${h} ${h === 1 ? 'hora' : 'horas'}`;
  const d = Math.round(h / 24);
  return `Hace ${d} ${d === 1 ? 'día' : 'días'}`;
}

/** "jueves, 23 de octubre" (para la cabecera del inicio). */
export function fechaLarga(ahora: Date | string = new Date()): string {
  if (typeof ahora === 'string') ahora = rangoDia(ahora).desde;
  const s = new Intl.DateTimeFormat('es-CO', { timeZone: ZONA, weekday: 'long', day: 'numeric', month: 'long' }).format(ahora);
  return s.charAt(0).toUpperCase() + s.slice(1);
}
