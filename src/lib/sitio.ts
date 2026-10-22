/* =============================================================
 * DIRECCIÓN PÚBLICA DEL SITIO — un único lugar
 *
 * La usan los metadatos (canonical, og:url, og:image), los datos
 * estructurados, el sitemap y el robots.txt. Antes cada archivo tenía
 * la suya copiada a mano: al mover el dominio había que acordarse de
 * cambiarla en todos, y olvidar una le dice a Google que el original
 * es el sitio viejo.
 *
 * El día del cambio de dominio basta con definir en Vercel:
 *   NEXT_PUBLIC_SITE_URL = https://el-dominio-nuevo.com
 * y redesplegar. No hay que tocar código.
 * ============================================================= */

export const SITIO_POR_DEFECTO = 'https://el-porton-cajica-9i6h.vercel.app';

/**
 * Normaliza lo que haya en la variable: quita espacios y saltos de línea
 * (se cuelan al pegar en Vercel) y la barra final. Si no es una dirección
 * http(s) válida, se usa la de por defecto en vez de romper el sitio.
 */
export function resolverSitio(valor?: string | null): string {
  const limpio = (valor ?? '').trim().replace(/\/+$/, '');
  if (!limpio) return SITIO_POR_DEFECTO;
  try {
    const u = new URL(limpio);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return SITIO_POR_DEFECTO;
    return u.origin;
  } catch {
    return SITIO_POR_DEFECTO;
  }
}

export const SITIO = resolverSitio(process.env.NEXT_PUBLIC_SITE_URL);
