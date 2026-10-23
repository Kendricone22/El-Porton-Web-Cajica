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
export function fechaLarga(ahora: Date = new Date()): string {
  const s = new Intl.DateTimeFormat('es-CO', { timeZone: ZONA, weekday: 'long', day: 'numeric', month: 'long' }).format(ahora);
  return s.charAt(0).toUpperCase() + s.slice(1);
}
