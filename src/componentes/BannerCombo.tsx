/* =============================================================
 * BANNER DE COMBO — tarjeta del ancho del contenido
 *
 * El combo existe desde siempre (papas + bebida, solo en hamburguesas y
 * perros), pero hasta ahora solo se descubría dentro del modal. Aquí
 * tiene su propio espacio, con el precio real tomado de COMBO_PRICE.
 *
 * La foto ocupa los dos tercios derechos y se funde hacia la izquierda,
 * donde va el texto. El borde de la tarjeta es un degradado rojo → negro
 * (prototipo del cliente). En celular, foto arriba y texto debajo.
 * ============================================================= */

import Image from 'next/image';
import { COMBO_PRICE } from '@/data/menu';
import { Icono } from './Iconos';

const fmt = (n: number) => '$' + n.toLocaleString('es-CO');

export default function BannerCombo({ onVer }: { onVer: () => void }) {
  return (
    <section className="rd-combo-full reveal" aria-labelledby="titulo-combo">
      <div className="rd-combo-fondo">
        <Image
          src="/assets/Platos/combo-clasica-doble.jpg"
          alt="Combo: Hamburguesa Clásica Doble con papas a la francesa y Coca-Cola"
          fill
          sizes="(max-width: 767px) 100vw, 60vw"
        />
      </div>
      <div className="rd-combo-velo" aria-hidden="true" />

      <div className="rd-combo-contenido">
        <span className="rd-raya" aria-hidden="true" />
        <h2 id="titulo-combo" className="rd-combo-titulo">
          ¿Antojo de algo <span>completo?</span>
        </h2>
        <p className="rd-combo-p">
          Convierte tu hamburguesa o perro en combo: <strong>papas + bebida</strong> a tu elección por solo{' '}
          <strong className="rd-rojo">+{fmt(COMBO_PRICE)}</strong>.
        </p>
        <button type="button" className="rd-btn rd-btn--rojo" onClick={onVer}>
          Armar mi combo <Icono nombre="flecha" size={16} />
        </button>
      </div>
    </section>
  );
}
