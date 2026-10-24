import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { aPrecio, calcularCambios, interpretarTabla, type FilaPos, type ProductoCarta } from './precios-pos';
import { decodificar, indiceColumna, leerXlsx } from './xlsx-lite';
import { MAPEO_POS, type MapeoPos } from '@/data/mapeo-pos';
import { MENU } from '@/data/menu';

/* ---------------- lector de Excel ---------------- */
describe('leerXlsx', () => {
  it('lee la primera hoja aunque no se llame sheet1, con textos compartidos, en línea y números', async () => {
    const buf = readFileSync(fileURLToPath(new URL('./__fixtures__/plantilla-prueba.xlsx', import.meta.url)));
    const t = await leerXlsx(buf);
    expect(t[0]).toEqual(['Codigo', 'Nombre', 'Precio']);
    expect(t[1]).toEqual(['112700001', 'HAMBURGUESA CLÁSICA & ÑOÑA', '16000']);
    expect(t[2]).toEqual(['999', '', '$ 2.500']); // celda B vacía se rellena
  });
  it('rechaza lo que no es un Excel', async () => {
    await expect(leerXlsx(new TextEncoder().encode('esto no es un zip'))).rejects.toThrow(/Excel/);
  });
  it('utilidades', () => {
    expect(indiceColumna('A')).toBe(0);
    expect(indiceColumna('C')).toBe(2);
    expect(indiceColumna('AA')).toBe(26);
    expect(decodificar('A &amp; B &#209; &#x41;')).toBe('A & B Ñ A');
  });
});

/* ---------------- precios ---------------- */
describe('aPrecio', () => {
  it('entiende los formatos habituales', () => {
    expect(aPrecio('15000')).toBe(15000);
    expect(aPrecio('15.000')).toBe(15000);
    expect(aPrecio('$ 15.000')).toBe(15000);
    expect(aPrecio('15,000')).toBe(15000);
    expect(aPrecio(15000)).toBe(15000);
    expect(aPrecio('1234.6')).toBe(1235);
  });
  it('vacío, texto, cero o negativo no son precios', () => {
    expect(aPrecio('')).toBeNull();
    expect(aPrecio('abc')).toBeNull();
    expect(aPrecio('0')).toBeNull();
    expect(aPrecio('-500')).toBeNull();
    expect(aPrecio(null)).toBeNull();
  });
});

describe('interpretarTabla', () => {
  it('encuentra las columnas por su título, en cualquier orden y con tildes', () => {
    const r = interpretarTabla([
      ['Precio', 'Código', 'Nombre'],
      ['16.000', '112700001', 'HAMBURGUESA CLASICA'],
      ['', '', ''],
    ]);
    expect(r.error).toBeNull();
    expect(r.filas).toEqual([{ codigo: '112700001', nombre: 'HAMBURGUESA CLASICA', precio: 16000, fila: 2 }]);
  });
  it('avisa si no es la plantilla', () => {
    expect(interpretarTabla([['A', 'B'], ['1', '2']]).error).toMatch(/Codigo/);
    expect(interpretarTabla([['Codigo', 'Nombre']]).error).toMatch(/Precio/);
  });
});

/* ---------------- cálculo de cambios ---------------- */
const carta: ProductoCarta[] = [
  { id: 'h-clasica', data: { name: 'Clásica', options: [{ label: 'Koller', price: 15000 }, { label: 'Pollo', price: 15500 }, { label: 'Artesanal', price: 19000 }] } },
  { id: 'm-carne', data: { name: 'Mazorcada', options: [{ label: '1/2 Porción', price: 21000 }, { label: 'Completa', price: 30000 }] } },
  { id: 'b-aguila', data: { name: 'Águila', options: [{ label: 'Porción', price: 4500 }] } },
  { id: 'p-clasico', data: { name: 'Perro Clásico', options: [{ label: 'Porción', price: 15000 }] } },
];
const mapeo: Record<string, MapeoPos> = {
  H1: { tipo: 'producto', id: 'h-clasica', opcion: 'Koller', arrastrar: true },
  M1: { tipo: 'producto', id: 'm-carne', opcion: '1/2 Porción' },
  M2: { tipo: 'producto', id: 'm-carne', opcion: 'Completa' },
  AG1: { tipo: 'producto', id: 'b-aguila', opcion: 'Porción' },
  AG2: { tipo: 'producto', id: 'b-aguila', opcion: 'Porción' },
  P1: { tipo: 'producto', id: 'p-clasico', opcion: 'Porción' },
  X: { tipo: 'producto', id: 'no-existe', opcion: 'Porción' },
  Y: { tipo: 'producto', id: 'p-clasico', opcion: 'Gigante' },
  CB: { tipo: 'combo' },
  AD: { tipo: 'adicion', nombre: 'Tocineta' },
};
const enCodigo = { combo: 9000, adiciones: { Tocineta: 6000 } };
const fila = (codigo: string, precio: number | null, nombre = codigo): FilaPos => ({ codigo, nombre, precio, fila: 2 });

describe('calcularCambios', () => {
  it('hamburguesa: fija Koller y arrastra Pollo y Artesanal la misma diferencia', () => {
    const r = calcularCambios([fila('H1', 16000)], carta, mapeo, enCodigo);
    expect(r.cambios).toHaveLength(1);
    expect(r.cambios[0].nuevas).toEqual([
      { label: 'Koller', price: 16000 },
      { label: 'Pollo', price: 16500 },
      { label: 'Artesanal', price: 20000 },
    ]);
    expect(r.cambios[0].opciones.map((o) => o.arrastrada)).toEqual([false, true, true]);
  });

  it('dos códigos del POS → dos opciones del mismo plato (media y completa)', () => {
    const r = calcularCambios([fila('M1', 22000), fila('M2', 31000)], carta, mapeo, enCodigo);
    expect(r.cambios[0].nuevas).toEqual([
      { label: '1/2 Porción', price: 22000 },
      { label: 'Completa', price: 31000 },
    ]);
  });

  it('sin diferencias no hay cambios (cuenta como "sin cambio")', () => {
    const r = calcularCambios([fila('P1', 15000), fila('H1', 15000)], carta, mapeo, enCodigo);
    expect(r.cambios).toEqual([]);
    expect(r.sinCambio).toBe(2);
  });

  it('dos códigos con el MISMO precio para una opción: no es conflicto', () => {
    const r = calcularCambios([fila('AG1', 5000), fila('AG2', 5000)], carta, mapeo, enCodigo);
    expect(r.errores).toEqual([]);
    expect(r.cambios[0].nuevas).toEqual([{ label: 'Porción', price: 5000 }]);
  });

  it('dos códigos con precios DISTINTOS para una opción: conflicto, no se toca el plato', () => {
    const r = calcularCambios([fila('AG1', 5000), fila('AG2', 5500)], carta, mapeo, enCodigo);
    expect(r.cambios).toEqual([]);
    expect(r.errores[0].motivo).toMatch(/un solo precio/);
  });

  it('códigos sin equivalencia se ignoran; precios inválidos y opciones inexistentes son errores', () => {
    const r = calcularCambios([fila('NADA', 1000, 'ICOPOR'), fila('P1', null), fila('X', 1000), fila('Y', 1000)], carta, mapeo, enCodigo);
    expect(r.ignorados).toEqual([{ codigo: 'NADA', nombre: 'ICOPOR', motivo: 'No está en la carta web' }]);
    expect(r.errores.map((e) => e.motivo)).toEqual([
      expect.stringMatching(/inválido/),
      expect.stringMatching(/no está en el menú/),
      expect.stringMatching(/opción "Gigante"/),
    ]);
  });

  it('combo y adiciones (en el código) solo avisan si cambiaron', () => {
    expect(calcularCambios([fila('CB', 9000), fila('AD', 6000)], carta, mapeo, enCodigo).avisos).toEqual([]);
    expect(calcularCambios([fila('CB', 10000), fila('AD', 6500)], carta, mapeo, enCodigo).avisos).toEqual([
      { concepto: 'Precio del combo', actual: 9000, nuevo: 10000 },
      { concepto: 'Adición: Tocineta', actual: 6000, nuevo: 6500 },
    ]);
  });

  it('marca para revisar las subidas o bajadas de más del 50%', () => {
    expect(calcularCambios([fila('P1', 16000)], carta, mapeo, enCodigo).cambios[0].alerta).toBe(false);
    expect(calcularCambios([fila('P1', 150000)], carta, mapeo, enCodigo).cambios[0].alerta).toBe(true);
  });
});

/* ---------------- la tabla de equivalencias real ---------------- */
describe('MAPEO_POS contra la carta del código', () => {
  it('cada producto y opción apuntados existen de verdad', () => {
    for (const [codigo, m] of Object.entries(MAPEO_POS)) {
      if (m.tipo !== 'producto') continue;
      const p = MENU.find((x) => x.id === m.id);
      expect(p, `código ${codigo} → ${m.id}`).toBeTruthy();
      expect(p!.options.map((o) => o.label), `código ${codigo} → ${m.id} / ${m.opcion}`).toContain(m.opcion);
    }
  });
  it('con los precios actuales de la carta, la plantilla no generaría cambios falsos', () => {
    // Si el POS tiene exactamente los precios de la web, no debe proponer nada.
    const filas: FilaPos[] = Object.entries(MAPEO_POS)
      .filter(([, m]) => m.tipo === 'producto')
      .map(([codigo, m]) => {
        const p = MENU.find((x) => x.id === (m as { id: string }).id)!;
        return fila(codigo, p.options.find((o) => o.label === (m as { opcion: string }).opcion)!.price);
      });
    const r = calcularCambios(filas, MENU.map((p) => ({ id: p.id, data: p })), MAPEO_POS, enCodigo);
    expect(r.cambios).toEqual([]);
    expect(r.errores).toEqual([]);
  });
});
