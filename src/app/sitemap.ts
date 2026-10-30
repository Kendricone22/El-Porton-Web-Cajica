import type { MetadataRoute } from 'next';
import { SITIO } from '@/lib/sitio';

/* La carta vive en `/`; /legal acompaña. El panel no se lista. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITIO}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITIO}/legal`, changeFrequency: 'yearly', priority: 0.2 },
  ];
}
