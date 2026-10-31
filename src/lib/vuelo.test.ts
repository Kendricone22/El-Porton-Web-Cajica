import { describe, expect, it } from 'vitest';
import { ANCHO_MURCIELAGO, trayectoCruce, trayectoEntrada, type Cuadro } from './vuelo';

/** Azar repetible para que las pruebas den siempre lo mismo. */
function semilla(n: number) {
  let s = n;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const finitos = (c: Cuadro[]) => c.every((q) => [q.x, q.y, q.r, q.s, q.o].every(Number.isFinite));

const PANTALLAS = [
  [375, 812],
  [1280, 800],
  [1920, 1080],
];

describe('trayectoCruce', () => {
  it.each(PANTALLAS)('en %ix%i entra y sale fuera de cuadro, en ambos sentidos', (w, h) => {
    for (let n = 0; n < 40; n++) {
      for (const desdeIzquierda of [true, false]) {
        const { cuadros, duracion } = trayectoCruce(w, h, semilla(n), { desdeIzquierda, y0: h * 0.3, escala: 0.9 });
        const ancho = ANCHO_MURCIELAGO * 0.9 * 1.05;
        const [a, z] = [cuadros[0], cuadros[cuadros.length - 1]];
        expect(finitos(cuadros)).toBe(true);
        if (desdeIzquierda) {
          expect(a.x + ancho).toBeLessThanOrEqual(0);
          expect(z.x).toBeGreaterThanOrEqual(w);
        } else {
          expect(a.x).toBeGreaterThanOrEqual(w);
          expect(z.x + ancho).toBeLessThanOrEqual(0);
        }
        expect(duracion).toBeGreaterThan(1000);
        expect(duracion).toBeLessThan(20000);
      }
    }
  });

  it('no se voltea: la inclinación queda entre −22° y 22°', () => {
    const { cuadros } = trayectoCruce(1280, 800, semilla(7), { desdeIzquierda: true, y0: 300, escala: 1 });
    expect(cuadros.every((q) => q.r >= -22 && q.r <= 22)).toBe(true);
  });
});

describe('trayectoEntrada', () => {
  it.each(PANTALLAS)('en %ix%i nace pequeño abajo y termina fuera de la pantalla', (w, h) => {
    for (let n = 0; n < 30; n++) {
      const total = 18;
      for (let i = 0; i < total; i++) {
        const { cuadros, duracion, retraso } = trayectoEntrada(w, h, semilla(n * 100 + i), i, total);
        const [a, z] = [cuadros[0], cuadros[cuadros.length - 1]];
        expect(finitos(cuadros)).toBe(true);
        expect(a.s).toBeLessThan(0.2);
        expect(a.o).toBe(0);
        expect(a.y).toBeGreaterThan(h * 0.7);
        const lado = ANCHO_MURCIELAGO * z.s;
        const fuera = z.x + lado < 0 || z.x > w || z.y + lado < 0 || z.y > h;
        expect(fuera).toBe(true);
        expect(duracion + retraso).toBeLessThan(4000);
      }
    }
  });
});
