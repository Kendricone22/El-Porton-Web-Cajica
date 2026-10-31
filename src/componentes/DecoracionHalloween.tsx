/* =============================================================
 * AMBIENTE DE HALLOWEEN
 *
 * Siempre va en el HTML y está oculto: solo se ve cuando el script
 * de temporada pone `data-temporada="halloween"` en <html> (ver
 * lib/temporada.ts). Así no hay estado ni efectos de React.
 *
 * Dos capas:
 *   - <DecoracionHalloween/> va DENTRO del hero: telarañas, araña
 *     colgando, niebla baja y luz de vela. (La luna no va aquí: las
 *     fotos del carrusel llenan la pantalla y siempre caía sobre la
 *     comida. Sale detrás de la tarjeta "¿Listo para pedir?".)
 *   - <AmbienteHalloween/> es FIJA sobre toda la página: niebla al
 *     pie de la pantalla y una araña que camina. Va por debajo del
 *     menú, el carrito y las ventanas.
 *   Los murciélagos van aparte, en <MurcielagosHalloween/>.
 *
 * Todo es decorativo: aria-hidden y sin clics (pointer-events: none).
 * Las animaciones solo mueven transform/opacity, para que vayan
 * fluidas también en celulares de gama baja.
 * ============================================================= */

/** Araña dibujada en línea para poder mover sus patas por separado. */
function AranaSvg() {
  const izq = ['M24 24 L13 13 L5 19', 'M23 27 L8 23 L2 31', 'M23 31 L8 35 L4 45', 'M25 34 L15 42 L13 50'];
  const der = ['M36 24 L47 13 L55 19', 'M37 27 L52 23 L58 31', 'M37 31 L52 35 L56 45', 'M35 34 L45 42 L47 50'];
  // Al caminar, una araña mueve en alternancia dos grupos de cuatro patas.
  const grupoA = [izq[0], der[1], izq[2], der[3]];
  const grupoB = [der[0], izq[1], der[2], izq[3]];
  return (
    <svg viewBox="0 0 60 54" className="hw-arana-svg">
      <g className="hw-patas hw-patas--a">
        {grupoA.map((d) => <path key={d} d={d} />)}
      </g>
      <g className="hw-patas hw-patas--b">
        {grupoB.map((d) => <path key={d} d={d} />)}
      </g>
      <ellipse cx="30" cy="32" rx="9" ry="11" className="hw-arana-cuerpo" />
      <circle cx="30" cy="18" r="6.5" className="hw-arana-cuerpo" />
    </svg>
  );
}

export default function DecoracionHalloween() {
  return (
    <div className="hw-deco" aria-hidden="true">
      <span className="hw-web hw-web--izq" />
      <span className="hw-web hw-web--der" />
      <span className="hw-colgante">
        <AranaSvg />
      </span>
      <span className="hw-niebla hw-niebla--atras" />
      <span className="hw-niebla hw-niebla--frente" />
      <span className="hw-vela" />
    </div>
  );
}

export function AmbienteHalloween() {
  return (
    <div className="hw-ambiente" aria-hidden="true">
      <span className="hw-niebla-pie hw-niebla-pie--1" />
      <span className="hw-niebla-pie hw-niebla-pie--2" />
      <span className="hw-caminante">
        <AranaSvg />
      </span>
    </div>
  );
}
