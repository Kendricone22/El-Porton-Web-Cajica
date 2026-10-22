import { describe, expect, it } from 'vitest';
import { CABECERAS_SEGURIDAD } from '../../next.config';

const valor = (k: string) => CABECERAS_SEGURIDAD.find((c) => c.key === k)?.value;

describe('cabeceras de seguridad', () => {
  it('impiden que el sitio se incruste en otro', () => {
    expect(valor('X-Frame-Options')).toBe('DENY');
    expect(valor('Content-Security-Policy')).toContain("frame-ancestors 'none'");
  });

  it('evitan que el navegador adivine tipos de archivo', () => {
    expect(valor('X-Content-Type-Options')).toBe('nosniff');
  });

  it('no filtran la ruta completa al salir a otro sitio', () => {
    expect(valor('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
  });

  it('cierran cámara, micrófono y ubicación', () => {
    const p = valor('Permissions-Policy') ?? '';
    for (const f of ['camera', 'microphone', 'geolocation']) expect(p).toContain(`${f}=()`);
  });

  it('no usan una CSP que bloquee los scripts de Next (solo frame-ancestors)', () => {
    expect(valor('Content-Security-Policy')).not.toMatch(/script-src|default-src/);
  });

  it('no hay claves repetidas', () => {
    const claves = CABECERAS_SEGURIDAD.map((c) => c.key);
    expect(new Set(claves).size).toBe(claves.length);
  });
});
