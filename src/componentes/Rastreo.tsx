'use client';

/* =============================================================
 * RASTREO DE LA PORTADA
 *
 * No pinta nada: solo registra una visita cuando se carga la portada.
 * Va en la portada y NO en el layout, así el panel (/admin) nunca se
 * cuenta como visita.
 * ============================================================= */

import { useEffect } from 'react';
import { registrarVisita } from '@/lib/rastreo-navegador';

/* Marca de módulo: en desarrollo React monta los efectos dos veces y se
   contaría doble. En producción no hace daño. */
let yaRegistrada = false;

export default function Rastreo() {
  useEffect(() => {
    if (yaRegistrada) return;
    yaRegistrada = true;
    registrarVisita();
  }, []);
  return null;
}
