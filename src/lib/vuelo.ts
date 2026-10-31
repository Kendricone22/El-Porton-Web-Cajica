/* =============================================================
 * TRAYECTORIAS DE VUELO DE LOS MURCIÉLAGOS (Halloween)
 *
 * Funciones puras: reciben el tamaño de la pantalla y un generador
 * de azar, y devuelven los cuadros clave que el navegador anima con
 * la Web Animations API. Se calculan con la pantalla real, así que
 * sirven igual en celular y en computador.
 *
 * Un murciélago no vuela recto: va a tirones, sube y baja con cada
 * serie de aletazos y se inclina en las curvas. Eso se arma con dos
 * ondas (una amplia y lenta, otra corta y rápida) más una deriva.
 * ============================================================= */

export type Cuadro = {
  /** Posición de la esquina superior izquierda del murciélago, en px. */
  x: number;
  y: number;
  /** Inclinación en grados (alabeo en las curvas). */
  r: number;
  /** Escala: < 1 lejos, > 1 cerca de la cámara. */
  s: number;
  /** Opacidad. */
  o: number;
};

export type Vuelo = { cuadros: Cuadro[]; duracion: number; retraso: number };

/** Ancho base del dibujo del murciélago (px) antes de escalar. */
export const ANCHO_MURCIELAGO = 72;

type Azar = () => number;

const entre = (azar: Azar, min: number, max: number) => min + (max - min) * azar();
const limitar = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Inclinación según hacia dónde va: sube → se ladea, baja → al otro lado. */
function alabeo(cuadros: Cuadro[], factor: number) {
  for (let i = 0; i < cuadros.length; i++) {
    const a = cuadros[Math.max(0, i - 1)];
    const b = cuadros[Math.min(cuadros.length - 1, i + 1)];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const grados = (Math.atan2(dy, Math.abs(dx) || 1) * 180) / Math.PI;
    cuadros[i].r = limitar(grados * factor * Math.sign(dx || 1), -22, 22);
  }
}

/**
 * Cruce lateral de un murciélago (vuelo de ambiente).
 * Entra por un costado fuera de cuadro y sale por el otro.
 */
export function trayectoCruce(
  ancho: number,
  alto: number,
  azar: Azar,
  op: { desdeIzquierda: boolean; y0: number; escala: number; desfase?: number },
): Vuelo {
  const N = 40;
  const margen = ANCHO_MURCIELAGO * op.escala + 40;
  const x0 = op.desdeIzquierda ? -margen : ancho + margen;
  const x1 = op.desdeIzquierda ? ancho + margen : -margen;

  const amplitud = entre(azar, 16, 44);
  const ondas = entre(azar, 1.4, 3.2);
  const fase = entre(azar, 0, Math.PI * 2);
  const fase2 = entre(azar, 0, Math.PI * 2);
  const deriva = (azar() - 0.5) * alto * 0.22;
  const tiron = entre(azar, 4, 9);

  const cuadros: Cuadro[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    // Velocidad que cambia un poco: acelera y frena como en un vuelo real.
    // La envolvente sin(πt) la anula en los extremos: así siempre entra y
    // sale fuera de cuadro (si no, aparecería o desaparecería de golpe).
    const avance = t + 0.035 * Math.sin(Math.PI * 4 * t + fase2) * Math.sin(Math.PI * t);
    cuadros.push({
      x: x0 + (x1 - x0) * avance,
      y:
        op.y0 +
        deriva * t +
        amplitud * Math.sin(Math.PI * 2 * ondas * t + fase) +
        tiron * Math.sin(Math.PI * 2 * 9 * t + fase2),
      r: 0,
      s: op.escala * (1 + 0.05 * Math.sin(Math.PI * 2 * 3 * t + fase)),
      o: 1,
    });
  }
  alabeo(cuadros, 0.55);

  // Más cerca de la cámara = parece ir más rápido.
  const velocidad = entre(azar, 190, 270) * (0.75 + 0.35 * op.escala);
  return {
    cuadros,
    duracion: (Math.abs(x1 - x0) / velocidad) * 1000,
    retraso: (op.desfase ?? 0) * 1000,
  };
}

/**
 * Entrada a la página: el murciélago `i` de `total` sale de la oscuridad
 * (abajo, al centro) y vuela hacia la cámara abriéndose en abanico hasta
 * salir de la pantalla. Unos pocos terminan muy grandes: pasan "cerca".
 */
export function trayectoEntrada(ancho: number, alto: number, azar: Azar, i: number, total: number): Vuelo {
  const N = 28;
  const ox = ancho / 2 + (azar() - 0.5) * ancho * 0.28;
  const oy = alto * 0.9;

  // Abanico de −168° a −12° (hacia arriba), repartido y con algo de azar.
  const paso = total > 1 ? i / (total - 1) : 0.5;
  const angulo = ((-168 + 156 * paso + entre(azar, -9, 9)) * Math.PI) / 180;

  const cercano = azar() < 0.22;
  const escalaFinal = cercano ? entre(azar, 3, 4.8) : entre(azar, 1.1, 2.2);
  const distancia = Math.hypot(ancho, alto) * 0.85 + ANCHO_MURCIELAGO * escalaFinal;

  const vaivenAmp = entre(azar, 24, 70);
  const vaivenOndas = entre(azar, 1.5, 3);
  const fase = entre(azar, 0, Math.PI * 2);
  const nx = -Math.sin(angulo); // perpendicular a la dirección, para el vaivén
  const ny = Math.cos(angulo);

  const cuadros: Cuadro[] = [];
  for (let k = 0; k <= N; k++) {
    const t = k / N;
    const p = Math.pow(t, 1.55); // acelera al acercarse a la cámara
    const vaiven = vaivenAmp * Math.sin(Math.PI * 2 * vaivenOndas * t + fase) * t;
    const s = 0.16 + (escalaFinal - 0.16) * Math.pow(t, 1.25);
    const mitad = (ANCHO_MURCIELAGO * s) / 2; // centra el dibujo en la trayectoria
    cuadros.push({
      x: ox + Math.cos(angulo) * distancia * p + nx * vaiven - mitad,
      y: oy + Math.sin(angulo) * distancia * p + ny * vaiven - mitad / 2,
      r: 0,
      s,
      o: t < 0.08 ? t / 0.08 : 1,
    });
  }
  alabeo(cuadros, 0.4);

  return {
    cuadros,
    duracion: entre(azar, 1900, 2700),
    retraso: paso * 850 + entre(azar, 0, 300),
  };
}
