'use client';

/* =============================================================
 * BOTÓN FLOTANTE "¿DUDAS? ESCRÍBENOS"
 *
 * Para quien tiene una pregunta antes de pedir (domicilio, zona,
 * ingredientes): abre WhatsApp con un mensaje ya escrito, en vez de
 * obligarlo a llamar o a irse. Va a la izquierda; el carrito, a la
 * derecha. Aparece al bajar del inicio: arriba taparía los datos de
 * domicilios y los puntos del carrusel, y las dudas surgen en el menú.
 * Se cuenta como evento (`whatsapp_click`) y sale en el embudo del
 * panel, para saber si de verdad se usa.
 *
 * El mensaje NO lleva el prefijo de pedidos ([WEB-PORTON-CAJICA]):
 * así el asesor distingue una pregunta de un pedido armado.
 * ============================================================= */

import { useEffect, useState } from 'react';
import { BRAND } from '@/data/menu';
import { registrarEvento } from '@/lib/rastreo-navegador';
import { Icono } from './Iconos';

const TELEFONO = (BRAND as { whatsapp: string }).whatsapp;
const MENSAJE = 'Hola, vengo de la página de El Portón y tengo una pregunta: ';
const ENLACE = `https://wa.me/${TELEFONO}?text=${encodeURIComponent(MENSAJE)}`;

export default function BotonPreguntar() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const mirar = () => setVisible(window.scrollY > window.innerHeight * 0.6);
    mirar();
    window.addEventListener('scroll', mirar, { passive: true });
    return () => window.removeEventListener('scroll', mirar);
  }, []);

  return (
    <a
      className={`preguntar-fab${visible ? ' is-visible' : ''}`}
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      href={ENLACE}
      target="_blank"
      rel="noopener"
      aria-label="Escribir una pregunta por WhatsApp"
      onClick={() => registrarEvento('whatsapp_click')}
    >
      <Icono nombre="whatsapp" size={20} />
      <span>¿Dudas? Escríbenos</span>
    </a>
  );
}
