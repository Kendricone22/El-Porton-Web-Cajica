/* =============================================================
 * MEDICIÓN DE VISITAS — lógica pura (sin red ni navegador)
 *
 * Qué se guarda y qué NO (Ley 1581):
 *   · SÍ: un identificador aleatorio por navegador ("persona"), otro que
 *     caduca a los 30 min ("visita"), la ruta y el ORIGEN (solo el
 *     dominio, o la etiqueta del enlace: instagram, qr-bolsa…).
 *   · NO: IP, nombre, correo, teléfono ni huella del dispositivo.
 * ============================================================= */

/** Una visita termina tras 30 minutos sin actividad. */
export const SESION_MS = 30 * 60 * 1000;

/**
 * ¿Hay que abrir una visita nueva? Sí si no había, si no se sabe cuándo
 * fue la última actividad, o si pasaron más de SESION_MS.
 */
export function sesionVigente(ultimaActividad: number | null, ahora: number): boolean {
  return !!ultimaActividad && ahora - ultimaActividad <= SESION_MS;
}

/** Rastreadores y automatización: no son visitas reales y falsearían el conteo. */
export function esBot(userAgent: string, webdriver = false): boolean {
  if (webdriver) return true;
  return /bot|crawl|spider|slurp|bingpreview|headless|lighthouse|preview|facebookexternalhit|whatsapp/i.test(userAgent || '');
}

/** Etiqueta limpia: minúsculas, solo letras/números/guion/punto, máx. 40. */
export function limpiarEtiqueta(valor: string | null | undefined): string | null {
  const v = (valor ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
    .slice(0, 40);
  return v || null;
}

/**
 * De dónde llegó la persona. Prioridad:
 *   1. La etiqueta del enlace (`?utm_source=instagram` o `?origen=qr-bolsa`):
 *      es lo que permite distinguir un QR de una bio de Instagram aunque
 *      ambos lleguen "directo" sin referrer.
 *   2. El dominio de la página anterior (google.com, instagram.com…).
 *   3. `null` = directo (escribió la dirección o abrió un enlace de
 *      WhatsApp, que no envía referrer).
 * Nunca la URL completa: podría llevar datos de más.
 */
export function origenDe(referrer: string, hostActual: string, search: string): string | null {
  const params = new URLSearchParams(search);
  const etiqueta = limpiarEtiqueta(params.get('utm_source') ?? params.get('origen'));
  if (etiqueta) return etiqueta;

  try {
    if (!referrer) return null;
    const h = new URL(referrer).hostname.replace(/^www\./, '');
    return h && h !== hostActual.replace(/^www\./, '') ? h : null;
  } catch {
    return null;
  }
}

export type FilaOrigen = { origen: string; visitas: number; personas: number };

/**
 * Agrupa visitas por origen. Una VISITA es una sesión: cinco recargas de
 * la misma sesión cuentan una. Una PERSONA es un visitor_id.
 * `null` se muestra como "Directo".
 */
export function agruparPorOrigen(filas: { session_id: string; visitor_id: string; referrer: string | null }[]): FilaOrigen[] {
  const por = new Map<string, { sesiones: Set<string>; personas: Set<string> }>();
  for (const f of filas) {
    const clave = f.referrer || 'Directo';
    const g = por.get(clave) ?? { sesiones: new Set<string>(), personas: new Set<string>() };
    g.sesiones.add(f.session_id);
    g.personas.add(f.visitor_id);
    por.set(clave, g);
  }
  return [...por.entries()]
    .map(([origen, g]) => ({ origen, visitas: g.sesiones.size, personas: g.personas.size }))
    .sort((a, b) => b.visitas - a.visitas || b.personas - a.personas || a.origen.localeCompare(b.origen));
}
