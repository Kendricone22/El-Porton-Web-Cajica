import { describe, expect, it } from 'vitest';
import { ajustarPrecio, borradorDe, camposCambiados, dataNueva, erroresDe, paraBuscar } from './tabla-menu';

const data = {
  name: 'Clásica',
  desc: 'Carne, queso',
  img: 'assets/x.jpg',
  combo: true,
  options: [
    { label: 'Koller', price: 15000 },
    { label: 'Pollo', price: 15500 },
  ],
};

describe('borrador y cambios', () => {
  it('el borrador inicial no tiene cambios', () => {
    const b = borradorDe(data, true);
    expect(b).toEqual({ name: 'Clásica', desc: 'Carne, queso', precios: ['15000', '15500'], available: true });
    expect(camposCambiados(data, true, b).size).toBe(0);
  });
  it('detecta cada campo cambiado; "15.000" vale lo mismo que 15000', () => {
    const b = { ...borradorDe(data, true), name: 'Clásica ', precios: ['15.000', '16000'], desc: 'Otra', available: false };
    expect([...camposCambiados(data, true, b)].sort()).toEqual(['available', 'desc', 'precio:1']);
  });
});

describe('erroresDe', () => {
  it('sin errores cuando todo es válido', () => {
    expect(erroresDe(borradorDe(data, true), ['Koller', 'Pollo'])).toEqual([]);
  });
  it('nombre vacío y precios inválidos', () => {
    const b = { ...borradorDe(data, true), name: '  ', precios: ['', 'abc'] };
    expect(erroresDe(b, ['Koller', 'Pollo'])).toEqual([
      'El nombre no puede quedar vacío',
      'Precio inválido en "Koller"',
      'Precio inválido en "Pollo"',
    ]);
  });
});

describe('dataNueva', () => {
  it('conserva todo lo demás del plato (foto, combo, etiquetas de opciones)', () => {
    const b = { ...borradorDe(data, true), name: ' Clásica Nueva ', precios: ['$ 16.000', '16500'], available: false };
    expect(dataNueva(data, b)).toEqual({
      name: 'Clásica Nueva',
      desc: 'Carne, queso',
      img: 'assets/x.jpg',
      combo: true,
      available: false,
      options: [
        { label: 'Koller', price: 16000 },
        { label: 'Pollo', price: 16500 },
      ],
    });
  });
});

describe('ajustarPrecio', () => {
  it('porcentaje redondeado a la centena', () => {
    expect(ajustarPrecio(15000, { tipo: 'porcentaje', valor: 5 })).toBe(15800); // 15.750 → 15.800
    expect(ajustarPrecio(15500, { tipo: 'porcentaje', valor: 10 })).toBe(17100); // 17.050 → 17.100
    expect(ajustarPrecio(20000, { tipo: 'porcentaje', valor: -10 })).toBe(18000);
  });
  it('monto fijo', () => {
    expect(ajustarPrecio(15000, { tipo: 'monto', valor: 1000 })).toBe(16000);
    expect(ajustarPrecio(15000, { tipo: 'monto', valor: -500 })).toBe(14500);
  });
  it('nunca baja de $100', () => {
    expect(ajustarPrecio(500, { tipo: 'monto', valor: -1000 })).toBe(100);
    expect(ajustarPrecio(1000, { tipo: 'porcentaje', valor: -100 })).toBe(100);
  });
});

it('paraBuscar ignora tildes y mayúsculas', () => {
  expect(paraBuscar('Montañera Clásica')).toBe('montanera clasica');
});
