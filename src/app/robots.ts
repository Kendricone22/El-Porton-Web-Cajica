import type { MetadataRoute } from 'next';
import { SITIO } from '@/lib/sitio';

/* robots.txt generado por Next. El panel y la API quedan fuera de los
   buscadores (el panel además lleva la etiqueta noindex en su layout:
   robots.txt es una petición educada que se puede ignorar). */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api/'] }],
    sitemap: `${SITIO}/sitemap.xml`,
    host: SITIO,
  };
}
