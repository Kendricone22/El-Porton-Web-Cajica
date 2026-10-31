import { describe, expect, it } from 'vitest';
import { clientesUnicos, diaAnterior, fechaBogota, fechaLarga, haceCuanto, inicioDiaBogota, kpisDeSerie, rangoDia, resumenDia, topDelDia, variacion } from './panel';

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

describe('un día concreto (calendario)', () => {
  it('rangoDia cubre de 00:00 a 24:00 en Bogotá (05:00 UTC)', () => {
    const { desde, hasta } = rangoDia('2026-10-23');
    expect(desde.toISOString()).toBe('2026-10-23T05:00:00.000Z');
    expect(hasta.toISOString()).toBe('2026-10-24T05:00:00.000Z');
  });

  it('diaAnterior cruza meses y años', () => {
    expect(diaAnterior('2026-11-01')).toBe('2026-10-31');
    expect(diaAnterior('2027-01-01')).toBe('2026-12-31');
  });

  it('fechaLarga acepta un día "AAAA-MM-DD"', () => {
    expect(fechaLarga('2026-10-23')).toBe('Viernes, 23 de octubre');
  });

  const pedidos = [
    // 23 oct 22:30 en Bogotá = 24 oct 03:30 UTC: cuenta para el 23.
    { created_at: '2026-10-24T03:30:00Z', status: 'entregado', subtotal: 30000, customer_phone: '3138214752',
      items: [{ name: 'Perro Clásico', cat: 'perros', qty: 2, unitPrice: 10000 }, { name: 'Gaseosa', qty: 1, unitPrice: 10000 }] },
    { created_at: '2026-10-23T18:00:00Z', status: 'nuevo', subtotal: 10000, customer_phone: '+57 313 821 4752',
      items: [{ name: 'Perro Clásico', cat: 'perros', qty: 1, unitPrice: 10000 }] },
    { created_at: '2026-10-23T19:00:00Z', status: 'cancelado', subtotal: 99000, customer_phone: '3000000000',
      items: [{ name: 'Pizza', qty: 5, unitPrice: 19800 }] },
    { created_at: '2026-10-22T19:00:00Z', status: 'entregado', subtotal: 5000, customer_phone: '3001112233', items: [] },
  ];

  it('resumenDia suma solo ese día y sin cancelados', () => {
    expect(resumenDia(pedidos, '2026-10-23')).toEqual({ ventas: 40000, pedidos: 2, ticket: 20000, clientes: 1 });
    expect(resumenDia(pedidos, '2026-10-22')).toEqual({ ventas: 5000, pedidos: 1, ticket: 5000, clientes: 1 });
    expect(resumenDia(pedidos, '2026-10-21')).toEqual({ ventas: 0, pedidos: 0, ticket: 0, clientes: 0 });
  });

  it('topDelDia agrupa por producto, ordena por unidades e ignora cancelados', () => {
    expect(topDelDia(pedidos, '2026-10-23')).toEqual([
      { producto: 'Perro Clásico', categoria: 'perros', unidades: 3, ingreso: 30000 },
      { producto: 'Gaseosa', categoria: '', unidades: 1, ingreso: 10000 },
    ]);
  });
});
