'use client';

/* =============================================================
 * FAVORITOS DE LA CASA (#carta)
 *
 * Reemplaza a la vitrina de filas gigantes: 4 tarjetas en una fila,
 * con precio y botón para pedir sin bajar hasta la carta completa.
 *
 * Los platos salen del MENÚ REAL ya fusionado con Supabase (por id),
 * así el precio y la descripción son siempre los que el dueño tiene
 * puestos hoy. Si un id dejara de existir o se agotara, simplemente no
 * se muestra.
 *
 * Se llama "favoritos de la casa" y no "más pedidos" a propósito:
 * todavía no hay datos de ventas que respalden ese título.
 * ============================================================= */

import type { ProductoMenu } from '@/types/menu';
import { FAVORITOS } from '@/data/portada';
import TarjetaProducto, { textoBoton } from './TarjetaProducto';
import { Icono } from './Iconos';

export default function Favoritos({
  menu,
  onPersonalizar,
}: {
  menu: ProductoMenu[];
  onPersonalizar: (id: string) => void;
}) {
  const platos = FAVORITOS.map((id) => menu.find((p) => p.id === id)).filter(
    (p): p is ProductoMenu => !!p && p.available !== false,
  );
  if (!platos.length) return null;

  return (
    <section id="carta" className="rd-seccion rd-favoritos reveal" aria-labelledby="titulo-favoritos">
      <header className="rd-cabecera">
        <h2 id="titulo-favoritos" className="rd-titulo">
          <Icono nombre="llama" className="rd-titulo-icono" />
          Favoritos de la casa
        </h2>
        <p className="rd-subtitulo">Los platos que nos hicieron famosos en Cajicá</p>
      </header>

      <div className="rd-favoritos-grid">
        {platos.map((p) => (
          <TarjetaProducto
            key={p.id}
            producto={p}
            boton={
              <button type="button" className="cat-card-btn" data-id={p.id} onClick={() => onPersonalizar(p.id)}>
                <span aria-hidden="true">+</span> {textoBoton(p)}
              </button>
            }
          />
        ))}
      </div>

      <div className="rd-centro">
        <a href="#menu-catalogo" className="rd-btn rd-btn--contorno">
          Ver la carta completa <Icono nombre="flecha" size={16} />
        </a>
      </div>
    </section>
  );
}
