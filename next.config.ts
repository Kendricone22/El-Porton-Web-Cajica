import type { NextConfig } from "next";

/* =============================================================
 * CABECERAS DE SEGURIDAD
 *
 * Vercel ya añade Strict-Transport-Security (HTTPS forzado). Estas son
 * las que faltaban:
 *
 *   · X-Content-Type-Options   el navegador no "adivina" tipos de archivo.
 *   · X-Frame-Options          nadie puede meter el sitio (ni el panel) en
 *                              un <iframe> ajeno para engañar con clics
 *                              (clickjacking). El `frame-ancestors` de la
 *                              CSP dice lo mismo para navegadores nuevos.
 *   · Referrer-Policy          al salir a otro sitio solo se envía el origen,
 *                              nunca la ruta completa.
 *   · Permissions-Policy       la web no usa cámara, micrófono ni
 *                              ubicación: se cierran de raíz.
 *
 * NO se añade una CSP completa a propósito: Next inyecta scripts en
 * línea y habría que firmarlos uno a uno (nonces); un error ahí deja el
 * sitio en blanco para los clientes. `frame-ancestors` es la única
 * directiva de la CSP que se aplica sola, sin ese riesgo.
 * ============================================================= */

/* Vive AQUÍ y no en src/lib a propósito: `next dev` compila este archivo
   aparte y no puede importar otros .ts del proyecto (falla con
   "Cannot find module"). El test la importa desde este mismo archivo. */
export const CABECERAS_SEGURIDAD = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
] as const;

const nextConfig: NextConfig = {
  /* Oculta la "N" de Next.js que sale abajo a la izquierda en modo
     desarrollo (en producción nunca aparece). Los errores de compilación
     se siguen mostrando igual. */
  devIndicators: false,
  async headers() {
    return [{ source: "/:path*", headers: [...CABECERAS_SEGURIDAD] }];
  },
};

export default nextConfig;
