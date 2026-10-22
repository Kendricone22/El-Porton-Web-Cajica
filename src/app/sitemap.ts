import type { MetadataRoute } from 'next';
import { SITIO } from '@/lib/sitio';

/* Una sola página pública: la carta vive en `/`. El panel no se lista. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: `${SITIO}/`, changeFrequency: 'weekly', priority: 1 }];
}
