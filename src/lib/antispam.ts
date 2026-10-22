/* =============================================================
 * ANTI-SPAM DE PEDIDOS — lógica pura (sin red), para poder probarla
 *
 * /api/pedidos escribe en la base de datos con la clave de servidor, así
 * que es el punto que un bot podría usar para llenar la tabla de pedidos
 * falsos. Hay cuatro capas, de más barata a más cara:
 *
 *   1. TRAMPA (honeypot): un campo invisible que ningún cliente real
 *      rellena. Si llega con texto, es un bot.
 *   2. POR CONEXIÓN (en memoria): pocas peticiones por IP en una ventana.
 *      Es un freno de BAJO COSTE, no una garantía: en Vercel cada
 *      instancia tiene su propia memoria y puede reiniciarse.
 *   3. POR TELÉFONO (base de datos): como máximo unos pedidos por
 *      número en 15 minutos. Mismo criterio que ya tenía el sitio v1.
 *   4. TOPE GLOBAL (base de datos): si en pocos minutos entran muchísimos
 *      más pedidos de los que un restaurante puede atender, se corta,
 *      aunque el bot cambie de IP y de teléfono en cada intento.
 *
 * Los umbrales son holgados a propósito: bloquear a un cliente de verdad
 * es peor que dejar pasar un pedido falso (que el panel permite cancelar).
 * ============================================================= */

export const LIMITES = {
  ipMax: 8,
  ipVentanaMs: 10 * 60_000,
  telefonoMax: 4,
  telefonoVentanaMs: 15 * 60_000,
  globalMax: 60,
  globalVentanaMs: 10 * 60_000,
} as const;

export const MENSAJE_DEMASIADOS =
  'Recibimos varios pedidos seguidos desde tu conexión. Espera unos minutos o escríbenos directamente por WhatsApp.';

/** ¿El campo trampa trae texto? Un cliente real nunca lo ve ni lo rellena. */
export function esTrampa(valor: unknown): boolean {
  return typeof valor === 'string' && valor.trim().length > 0;
}

/** IP de quien llama. En Vercel `x-forwarded-for` lo escribe la plataforma. */
export function ipDe(headers: Pick<Headers, 'get'>): string {
  const xff = headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim() || 'desconocida';
  return headers.get('x-real-ip')?.trim() || 'desconocida';
}

export type Limitador = { permitir: (clave: string, ahora?: number) => boolean };

/**
 * Ventana deslizante en memoria: permite como máximo `max` llamadas por
 * clave dentro de `ventanaMs`. Las llamadas rechazadas NO alargan el
 * castigo (no se registran), y el mapa se poda para no crecer sin límite.
 */
export function crearLimitador(opciones: { max: number; ventanaMs: number; maxClaves?: number }): Limitador {
  const { max, ventanaMs, maxClaves = 5000 } = opciones;
  const registro = new Map<string, number[]>();

  function podar(ahora: number) {
    for (const [clave, marcas] of registro) {
      const vivas = marcas.filter((t) => ahora - t < ventanaMs);
      if (vivas.length) registro.set(clave, vivas);
      else registro.delete(clave);
    }
  }

  return {
    permitir(clave, ahora = Date.now()) {
      if (registro.size >= maxClaves) podar(ahora);
      // Si aun podando está lleno, se descarta lo más antiguo: preferible
      // a crecer sin límite y tirar la instancia por memoria.
      if (registro.size >= maxClaves) {
        const primera = registro.keys().next().value;
        if (primera !== undefined) registro.delete(primera);
      }

      const vivas = (registro.get(clave) ?? []).filter((t) => ahora - t < ventanaMs);
      if (vivas.length >= max) {
        registro.set(clave, vivas);
        return false;
      }
      vivas.push(ahora);
      registro.set(clave, vivas);
      return true;
    },
  };
}

export type Conteos = { porTelefono: number | null; global: number | null };

/**
 * Decide con los conteos de la base de datos. `null` = no se pudo contar
 * (la base falló): se deja pasar, porque esta ruta nunca bloquea una venta
 * por una incidencia de infraestructura.
 */
export function motivoDeBloqueo(c: Conteos): 'telefono' | 'global' | null {
  if (c.porTelefono !== null && c.porTelefono >= LIMITES.telefonoMax) return 'telefono';
  if (c.global !== null && c.global >= LIMITES.globalMax) return 'global';
  return null;
}

/** Lee el total de la cabecera `Content-Range: 0-0/17` o `*​/0` de PostgREST. */
export function totalDeContentRange(cabecera: string | null): number | null {
  const m = cabecera?.match(/\/(\d+)$/);
  return m ? Number(m[1]) : null;
}
