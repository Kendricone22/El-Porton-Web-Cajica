import { describe, expect, it } from 'vitest';
import robots from './robots';
import sitemap from './sitemap';
import { SITIO } from '@/lib/sitio';

describe('robots.txt', () => {
  const r = robots();
  const reglas = Array.isArray(r.rules) ? r.rules : [r.rules];

  it('deja entrar al sitio pero no al panel ni a la API', () => {
    expect(reglas[0].allow).toBe('/');
    expect(reglas[0].disallow).toEqual(expect.arrayContaining(['/admin', '/api/']));
  });

  it('apunta al sitemap del dominio configurado', () => {
    expect(r.sitemap).toBe(`${SITIO}/sitemap.xml`);
  });
});

describe('sitemap.xml', () => {
  const s = sitemap();

  it('lista la portada y /legal con la dirección absoluta del dominio configurado', () => {
    expect(s.map((e) => e.url)).toEqual([`${SITIO}/`, `${SITIO}/legal`]);
  });

  it('no expone el panel', () => {
    expect(s.some((e) => e.url.includes('/admin'))).toBe(false);
  });
});
