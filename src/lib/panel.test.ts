import { describe, expect, it } from 'vitest';
import { clientesUnicos, fechaBogota, haceCuanto, inicioDiaBogota, kpisDeSerie, variacion } from './panel';

describe('fechaBogota / inicioDiaBogota', () => {
  it('usa la fecha de Bogotá, no la UTC', () => {
    // 2026-10-23 02:00 UTC = 2026-10-22 21:00 en Bogotá
    expect(fechaBogota('2026-10-23T02:00:00Z')).toBe('2026-10-22');
    expect(fechaBogota('2026-10-23T06:00:00Z')).toBe('2026-10-23');
  });
  it('el día empieza a las 05:00 UTC (00:00 en Bogotá)', () => {
    const ahora = new Date('2026-10-23T15:00:00Z');
    expect(inicioDiaBogota(0, ahora).toISOString()).toBe('2026-10-23T05:00:00.000Z');
    expect(inicioDiaBogota(-1, ahora).toISOString()).toBe('2026-10-22T05:00:00.000Z');
  });
  it('a las 23:30 de Bogotá sigue siendo el mismo día', () => {
    const ahora = new Date('2026-10-24T04:30:00Z'); // 23:30 del 23 en Bogotá
    expect(inicioDiaBogota(0, ahora).toISOString()).toBe('2026-10-23T05:00:00.000Z');
  });
});

describe('variacion', () => {
  it('calcula el % frente a ayer', () => {
    expect(variacion(120, 100)).toBe(20);
    expect(variacion(80, 100)).toBe(-20);
  });
  it('sin datos de ayer devuelve null (no "infinito %")', () => {
    expect(variacion(50, 0)).toBeNull();
  });
});

describe('kpisDeSerie', () => {
  it('toma ayer y hoy de los dos últimos puntos', () => {
    const k = kpisDeSerie([
      { inicio: '2026-10-21', ingreso: 999, pedidos: 9 },
      { inicio: '2026-10-22', ingreso: 100000, pedidos: 4 },
      { inicio: '2026-10-23', ingreso: 150000, pedidos: 5 },
    ]);
    expect(k.ventas).toEqual({ hoy: 150000, ayer: 100000 });
    expect(k.pedidos).toEqual({ hoy: 5, ayer: 4 });
    expect(k.ticket).toEqual({ hoy: 30000, ayer: 25000 });
  });
  it('sin pedidos el ticket es 0, no NaN', () => {
    const k = kpisDeSerie([{ inicio: '2026-10-23', ingreso: 0, pedidos: 0 }]);
    expect(k.ticket).toEqual({ hoy: 0, ayer: 0 });
  });
  it('acepta números que llegan como texto (bigint de Postgres)', () => {
    const k = kpisDeSerie([{ inicio: '2026-10-23', ingreso: '50000' as unknown as number, pedidos: '2' as unknown as number }]);
    expect(k.ticket.hoy).toBe(25000);
  });
});

describe('clientesUnicos', () => {
  const hoy = '2026-10-23';
  const p = (tel: string, cuando: string, status = 'nuevo') => ({ customer_phone: tel, created_at: cuando, status });

  it('cuenta teléfonos distintos del día, sin importar el formato', () => {
    expect(
      clientesUnicos(
        [p('313 821 4752', '2026-10-23T15:00:00Z'), p('3138214752', '2026-10-23T16:00:00Z'), p('+57 3138214752', '2026-10-23T17:00:00Z'), p('3000000000', '2026-10-23T18:00:00Z')],
        hoy,
      ),
    ).toBe(2);
  });
  it('no cuenta cancelados ni otros días', () => {
    expect(clientesUnicos([p('300', '2026-10-23T15:00:00Z', 'cancelado'), p('301', '2026-10-22T15:00:00Z')], hoy)).toBe(0);
  });
});

describe('haceCuanto', () => {
  const ahora = new Date('2026-10-23T15:00:00Z');
  it('redacta el tiempo transcurrido', () => {
    expect(haceCuanto('2026-10-23T14:59:30Z', ahora)).toBe('Hace un momento');
    expect(haceCuanto('2026-10-23T14:58:00Z', ahora)).toBe('Hace 2 minutos');
    expect(haceCuanto('2026-10-23T14:59:00Z', ahora)).toBe('Hace 1 minuto');
    expect(haceCuanto('2026-10-23T12:00:00Z', ahora)).toBe('Hace 3 horas');
    expect(haceCuanto('2026-10-21T15:00:00Z', ahora)).toBe('Hace 2 días');
  });
});
