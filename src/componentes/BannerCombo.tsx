/* =============================================================
 * BANNER DE COMBO
 *
 * El combo existe desde siempre (papas + bebida, solo en hamburguesas y
 * perros), pero hasta ahora solo se descubría dentro del modal. Aquí
 * tiene su propio espacio, con el precio real tomado de COMBO_PRICE.
 * ============================================================= */

import Image from 'next/image';
import { COMBO_PRICE } from '@/data/menu';
import { Icono } from './Iconos';

const fmt = (n: number) => '$' + n.toLocaleString('es-CO');

export default function BannerCombo({ onVer }: { onVer: () => void }) {
  return (
    <section className="rd-seccion reveal" aria-labelledby="titulo-combo">
      <div className="rd-combo">
        <div className="rd-combo-texto">
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

        <div className="rd-combo-media">
          <Image
            src="/assets/Platos/hamburguesa-golosa-wide.jpg"
            /* No hay foto real de un combo (papas + bebida): se usa la
               Golosa con su nombre verdadero. Cuando exista la foto del
               combo, basta con cambiar `src` y `alt`. */
            alt="Hamburguesa Golosa"
            fill
            sizes="(max-width: 900px) 100vw, 55vw"
          />
        </div>
      </div>
    </section>
  );
}
