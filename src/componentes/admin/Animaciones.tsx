'use client';

/* =============================================================
 * ANIMACIONES DEL PANEL (sin librerías)
 *
 * Inspiradas en el video de referencia del cliente (hecho con
 * framer-motion). Aquí se resuelven con CSS + requestAnimationFrame para
 * no sumar una dependencia de ~40 KB solo por esto:
 *
 *   · Contador   → los números suben desde 0 (o desde el valor anterior)
 *                  hasta el real, frenando al final.
 *   · Esqueleto  → bloques grises con brillo mientras llegan los datos.
 *
 * La entrada en cascada, el trazo de la gráfica y el "levantar al pasar
 * el mouse" son CSS puro (estilos-panel.css, sección "Animaciones").
 * ============================================================= */

import { useEffect, useRef, useState } from 'react';

const DURACION_MS = 900;
/** Arranca rápido y frena al final, como en el video. */
const frenado = (t: number) => 1 - Math.pow(1 - t, 3);

export function Contador({ valor, formato = (n) => String(Math.round(n)) }: { valor: number; formato?: (n: number) => string }) {
  const [mostrado, setMostrado] = useState(0);
  const desde = useRef(0);

  useEffect(() => {
    const inicio = desde.current;
    const t0 = performance.now();
    let id = 0;
    const paso = (ahora: number) => {
      const t = Math.min(1, (ahora - t0) / DURACION_MS);
      const v = inicio + (valor - inicio) * frenado(t);
      desde.current = v;
      setMostrado(v);
      if (t < 1) id = requestAnimationFrame(paso);
    };
    id = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(id);
  }, [valor]);

  return <>{formato(mostrado)}</>;
}

/** Líneas grises con brillo. `lineas` = cuántas; la última más corta. */
export function Esqueleto({ lineas = 3, alto }: { lineas?: number; alto?: string }) {
  return (
    /* <span> y no <div>: se usa también dentro de párrafos (el valor de
       los indicadores), y un <div> dentro de un <p> es HTML inválido. */
    <span className="pn-esqueleto" role="status" aria-label="Cargando">
      {Array.from({ length: lineas }, (_, i) => (
        <span key={i} style={{ width: i === lineas - 1 && lineas > 1 ? '60%' : '100%', height: alto }} />
      ))}
    </span>
  );
}
