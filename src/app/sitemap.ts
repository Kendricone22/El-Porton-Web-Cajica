import type { MetadataRoute } from 'next';
import { SITIO } from '@/lib/sitio';

/* La carta vive en `/`. El panel no se lista; /legal tampoco, porque
   lleva noindex mientras le falten los datos del negocio. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: `${SITIO}/`, changeFrequency: 'weekly', priority: 1 }];
}
