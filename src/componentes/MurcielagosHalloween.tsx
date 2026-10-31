'use client';

/* =============================================================
 * MURCIÉLAGOS DE HALLOWEEN
 *
 * Dos capas fijas, solo en temporada (lib/temporada.ts):
 *   - Entrada: al abrir la página, la pantalla se oscurece un instante
 *     y una nube de murciélagos sale de la oscuridad hacia la cámara.
 *   - Ambiente: cada 7–15 s cruza una bandada de 1 a 4.
 *
 * Cada murciélago es un dibujo con alas independientes (giran desde el
 * hombro, se pliegan al subir), cuerpo que sube y baja con el aletazo y
 * ojos encendidos. El vuelo lo calcula lib/vuelo.ts con la pantalla real
 * y lo anima el navegador (Web Animations API): sin re-render de React,
 * solo transform/opacity. Cada murciélago se borra al salir de cuadro.
 *
 * No hay estado de React: el efecto crea y quita los nodos a mano en
 * capas que React no toca (los <div> quedan vacíos en el HTML).
 * ============================================================= */

import { useEffect, useRef } from 'react';
import { trayectoCruce, trayectoEntrada, type Cuadro, type Vuelo } from '@/lib/vuelo';

/* Ala izquierda; la derecha es la misma reflejada en x = 120 − x. */
const ALA_IZQ =
  'M55 23 C47 15 31 7 13 6 C7 6 3 9 0 14 C6 14 10 18 12 25 C16 21 22 21 26 27 C30 23 36 23 40 29 C44 26 50 27 55 33 Z';
const ALA_DER =
  'M65 23 C73 15 89 7 107 6 C113 6 117 9 120 14 C114 14 110 18 108 25 C104 21 98 21 94 27 C90 23 84 23 80 29 C76 26 70 27 65 33 Z';
const HUESOS_IZQ = 'M55 24 L13 7 M55 24 L12 24 M55 25 L26 26 M55 26 L40 28';
const HUESOS_DER = 'M65 24 L107 7 M65 24 L108 24 M65 25 L94 26 M65 26 L80 28';

const DIBUJO = `<svg viewBox="0 0 120 60" focusable="false">
<g class="hw-mc-ala hw-mc-ala--izq"><path class="hw-mc-membrana" d="${ALA_IZQ}"/><path class="hw-mc-hueso" d="${HUESOS_IZQ}"/></g>
<g class="hw-mc-ala hw-mc-ala--der"><path class="hw-mc-membrana" d="${ALA_DER}"/><path class="hw-mc-hueso" d="${HUESOS_DER}"/></g>
<g class="hw-mc-cuerpo"><path d="M56 15 L55 6 L59.5 12.5 Z M64 15 L65 6 L60.5 12.5 Z"/><circle cx="60" cy="18" r="5.6"/><ellipse cx="60" cy="31" rx="6" ry="10.5"/><circle class="hw-mc-ojo" cx="58" cy="17.6" r="0.95"/><circle class="hw-mc-ojo" cx="62" cy="17.6" r="0.95"/></g>
</svg>`;

const cuadroCss = (c: Cuadro): Keyframe => ({
  transform: `translate3d(${c.x.toFixed(1)}px, ${c.y.toFixed(1)}px, 0) rotate(${c.r.toFixed(1)}deg) scale(${c.s.toFixed(3)})`,
  opacity: c.o,
});

export default function MurcielagosHalloween() {
  const capaAmbiente = useRef<HTMLDivElement>(null);
  const capaEntrada = useRef<HTMLDivElement>(null);
  const velo = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (document.documentElement.dataset.temporada !== 'halloween') return;
    const ambiente = capaAmbiente.current;
    const entrada = capaEntrada.current;
    if (!ambiente || !entrada || typeof Element.prototype.animate !== 'function') return;

    const azar = Math.random;
    const relojes: number[] = [];
    const vivas = new Set<Animation>();
    let enAmbiente = 0;
    let activo = true;

    function volar(capa: HTMLElement, vuelo: Vuelo, aleteo: number, clase: string, alTerminar?: () => void) {
      const el = document.createElement('span');
      el.className = `hw-mc ${clase}`;
      el.style.setProperty('--aleteo', `${aleteo.toFixed(3)}s`);
      // Desfasa el aleteo para que la bandada no aletee al unísono.
      el.style.setProperty('--desfase', `${(-azar() * aleteo).toFixed(3)}s`);
      el.innerHTML = DIBUJO;
      capa.appendChild(el);
      const anim = el.animate(vuelo.cuadros.map(cuadroCss), {
        duration: vuelo.duracion,
        delay: vuelo.retraso,
        easing: 'linear',
        fill: 'both',
      });
      vivas.add(anim);
      const fin = () => {
        vivas.delete(anim);
        el.remove();
        alTerminar?.();
      };
      anim.onfinish = fin;
      anim.oncancel = fin;
    }

    /* ---------- Entrada ---------- */
    const W = window.innerWidth;
    const H = window.innerHeight;
    const total = W < 768 ? 18 : 30;
    const oscurecer = velo.current?.animate(
      [{ opacity: 0 }, { opacity: 1, offset: 0.1 }, { opacity: 1, offset: 0.55 }, { opacity: 0 }],
      { duration: 3500, easing: 'ease-in-out', fill: 'both' },
    );
    for (let i = 0; i < total; i++) {
      const v = trayectoEntrada(W, H, azar, i, total);
      const cerca = v.cuadros[v.cuadros.length - 1].s > 2.2;
      volar(entrada, v, 0.12 + azar() * 0.07, cerca ? 'hw-mc--cerca' : '');
    }

    /* ---------- Ambiente: bandadas de vez en cuando ---------- */
    function bandada() {
      if (!activo) return;
      // Pestaña oculta o ya hay varios en vuelo: no lanza más (ahorra batería).
      if (!document.hidden && enAmbiente < 5) {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const n = 1 + Math.floor(azar() * 4);
        const desdeIzquierda = azar() < 0.5;
        // Siempre por debajo del menú superior (≈ 150 px).
        const y0 = Math.max(170, h * (0.2 + azar() * 0.38));
        const base = 0.5 + azar() * 0.65;
        for (let j = 0; j < n; j++) {
          const escala = base * (0.8 + azar() * 0.4);
          const v = trayectoCruce(w, h, azar, {
            desdeIzquierda,
            y0: y0 + (azar() - 0.5) * 90,
            escala,
            desfase: j * (0.15 + azar() * 0.4),
          });
          enAmbiente++;
          volar(ambiente!, v, 0.19 + azar() * 0.1, escala < 0.7 ? 'hw-mc--lejos' : '', () => enAmbiente--);
        }
      }
      relojes.push(window.setTimeout(bandada, 7000 + azar() * 8000));
    }
    relojes.push(window.setTimeout(bandada, 3800));

    return () => {
      activo = false;
      relojes.forEach((r) => window.clearTimeout(r));
      vivas.forEach((a) => a.cancel());
      oscurecer?.cancel();
    };
  }, []);

  return (
    <>
      <div ref={capaAmbiente} className="hw-murcielagos" aria-hidden="true" />
      <div ref={capaEntrada} className="hw-entrada" aria-hidden="true">
        <span ref={velo} className="hw-entrada-velo" />
      </div>
    </>
  );
}
