import { describe, expect, it } from 'vitest';
import {
  crearLimitador,
  esTrampa,
  ipDe,
  LIMITES,
  motivoDeBloqueo,
  totalDeContentRange,
} from './antispam';

describe('esTrampa (honeypot)', () => {
  it('un campo vacío o ausente es un cliente real', () => {
    expect(esTrampa(undefined)).toBe(false);
    expect(esTrampa('')).toBe(false);
    expect(esTrampa('   ')).toBe(false);
    expect(esTrampa(null)).toBe(false);
  });
  it('cualquier texto en el campo es un bot', () => {
    expect(esTrampa('http://spam.example')).toBe(true);
    expect(esTrampa('x')).toBe(true);
  });
  it('lo que no es texto no cuenta como relleno', () => {
    expect(esTrampa(123)).toBe(false);
    expect(esTrampa({})).toBe(false);
  });
});

describe('ipDe', () => {
  const h = (o: Record<string, string>) => ({ get: (k: string) => o[k.toLowerCase()] ?? null });
  it('toma la primera de x-forwarded-for', () => {
    expect(ipDe(h({ 'x-forwarded-for': '1.2.3.4, 10.0.0.1' }))).toBe('1.2.3.4');
  });
  it('cae a x-real-ip y luego a "desconocida"', () => {
    expect(ipDe(h({ 'x-real-ip': '5.6.7.8' }))).toBe('5.6.7.8');
    expect(ipDe(h({}))).toBe('desconocida');
  });
});

describe('crearLimitador', () => {
  it('permite hasta el máximo y bloquea la siguiente', () => {
    const l = crearLimitador({ max: 3, ventanaMs: 1000 });
    expect([l.permitir('a', 0), l.permitir('a', 1), l.permitir('a', 2)]).toEqual([true, true, true]);
    expect(l.permitir('a', 3)).toBe(false);
  });

  it('cada clave tiene su propio contador', () => {
    const l = crearLimitador({ max: 1, ventanaMs: 1000 });
    expect(l.permitir('a', 0)).toBe(true);
    expect(l.permitir('b', 0)).toBe(true);
    expect(l.permitir('a', 1)).toBe(false);
  });

  it('vuelve a permitir cuando pasa la ventana', () => {
    const l = crearLimitador({ max: 1, ventanaMs: 1000 });
    expect(l.permitir('a', 0)).toBe(true);
    expect(l.permitir('a', 500)).toBe(false);
    expect(l.permitir('a', 1001)).toBe(true);
  });

  it('los intentos rechazados no alargan el castigo', () => {
    const l = crearLimitador({ max: 1, ventanaMs: 1000 });
    l.permitir('a', 0);
    for (let t = 100; t < 900; t += 100) l.permitir('a', t); // rechazados
    expect(l.permitir('a', 1001)).toBe(true);
  });

  it('no crece sin límite: respeta maxClaves y sigue funcionando', () => {
    const l = crearLimitador({ max: 5, ventanaMs: 10_000, maxClaves: 50 });
    for (let i = 0; i < 500; i++) expect(l.permitir(`ip-${i}`, i)).toBe(true);
    expect(l.permitir('nueva', 600)).toBe(true);
  });
});

describe('motivoDeBloqueo', () => {
  it('deja pasar por debajo de los límites', () => {
    expect(motivoDeBloqueo({ porTelefono: LIMITES.telefonoMax - 1, global: LIMITES.globalMax - 1 })).toBeNull();
  });
  it('bloquea al llegar al límite por teléfono', () => {
    expect(motivoDeBloqueo({ porTelefono: LIMITES.telefonoMax, global: 0 })).toBe('telefono');
  });
  it('bloquea al llegar al tope global', () => {
    expect(motivoDeBloqueo({ porTelefono: 0, global: LIMITES.globalMax })).toBe('global');
  });
  it('si la base no pudo contar (null) NO bloquea la venta', () => {
    expect(motivoDeBloqueo({ porTelefono: null, global: null })).toBeNull();
  });
});

describe('totalDeContentRange', () => {
  it('lee el total de PostgREST', () => {
    expect(totalDeContentRange('0-0/17')).toBe(17);
    expect(totalDeContentRange('*/0')).toBe(0);
  });
  it('devuelve null si no hay cabecera válida', () => {
    expect(totalDeContentRange(null)).toBeNull();
    expect(totalDeContentRange('basura')).toBeNull();
    expect(totalDeContentRange('0-0/*')).toBeNull();
  });
});
