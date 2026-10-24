import { describe, expect, it } from 'vitest';
import { COLUMNAS, codigosPorOpcion, filasParaExportar, nombreArchivo } from './exportar-menu';
import { crearXlsx, escaparXml } from './xlsx-escribir';
import { leerXlsx } from './xlsx-lite';
import { calcularCambios, interpretarTabla } from './precios-pos';
import { MAPEO_POS } from '@/data/mapeo-pos';
import { ADICIONES, CATEGORIES, COMBO_PRICE, MENU } from '@/data/menu';

const ORDEN = CATEGORIES.map((c) => c.key);

describe('crearXlsx (ida y vuelta con el lector)', () => {
  it('lo que se escribe se vuelve a leer igual: textos, números, tildes, saltos de línea y símbolos', async () => {
    const filas = [
      ['Codigo', 'Nombre', 'Precio'],
      ['112700001', 'Clásica & "Ñoña" <especial>', 15000],
      ['', 'Línea 1\nLínea 2', 4500],
    ];
    const t = await leerXlsx(crearXlsx(filas, { anchos: [12, 30, 10] }));
    expect(t).toEqual([
      ['Codigo', 'Nombre', 'Precio'],
      ['112700001', 'Clásica & "Ñoña" <especial>', '15000'],
      ['', 'Línea 1\nLínea 2', '4500'],
    ]);
  });
  it('escapa XML y quita caracteres de control', () => {
    expect(escaparXml('a & b < c \u0001')).toBe('a &amp; b &lt; c ');
  });
  it('es un ZIP válido (empieza con la firma PK)', () => {
    const b = crearXlsx([['x']]);
    expect([b[0], b[1]]).toEqual([0x50, 0x4b]);
  });
});

describe('filasParaExportar', () => {
  const filas = MENU.map((p, i) => ({ id: p.id, cat: p.cat, sort_order: i, data: p }));
  const t = filasParaExportar(filas, MAPEO_POS, ORDEN);

  it('mismas columnas que la plantilla de VectorPOS', () => {
    expect(t[0]).toEqual(COLUMNAS);
  });
  it('una fila por precio, con el código del POS cuando existe', () => {
    const clasica = t.filter((r) => String(r[1]).startsWith('Clásica - '));
    expect(clasica).toEqual([
      ['112700001', 'Clásica - Koller', 15000, 'HAMBURGUESAS', 'COCINA', expect.any(String)],
      ['', 'Clásica - Pollo', 15500, 'HAMBURGUESAS', 'COCINA', expect.any(String)],
      ['', 'Clásica - Artesanal', 19000, 'HAMBURGUESAS', 'COCINA', expect.any(String)],
    ]);
  });
  it('platos de un solo precio salen sin sufijo; categorías con el nombre del POS', () => {
    expect(t.find((r) => r[0] === '112600010')).toEqual(['112600010', 'Todo Terreno', 24000, 'PERROS CALIENTES', 'COCINA', expect.any(String)]);
    expect(t.find((r) => r[0] === '117400003')?.[3]).toBe('PAPITAS Y MAS');
    expect(t.find((r) => r[0] === '213100004')?.[3]).toBe('CERVEZAS');
  });
  it('cuenta exacta: tantas filas como precios en la carta', () => {
    const precios = MENU.reduce((n, p) => n + p.options.length, 0);
    expect(t.length - 1).toBe(precios);
  });
  it('Águila normal y light comparten producto: se exporta con el primer código', () => {
    expect(codigosPorOpcion(MAPEO_POS).get('b-aguila|Porción')).toBe('213100002');
  });
  it('el archivo exportado se puede volver a subir en "Precios POS" sin cambios falsos', async () => {
    const leida = await leerXlsx(crearXlsx(t));
    const { filas: pos, error } = interpretarTabla(leida);
    expect(error).toBeNull();
    const r = calcularCambios(pos, MENU.map((p) => ({ id: p.id, data: p })), MAPEO_POS, {
      combo: COMBO_PRICE,
      adiciones: Object.fromEntries(ADICIONES.map((a) => [a.name, a.price])),
    });
    expect(r.cambios).toEqual([]);
    expect(r.errores).toEqual([]);
  });
});

it('nombreArchivo usa la fecha de Bogotá', () => {
  expect(nombreArchivo(new Date('2026-10-24T03:00:00Z'))).toBe('Menu_ElPorton_2026-10-23.xlsx');
});
