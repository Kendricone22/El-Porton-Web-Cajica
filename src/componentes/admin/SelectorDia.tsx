'use client';

/* =============================================================
 * CALENDARIO DEL PANEL — elegir un día concreto
 *
 * Usa el selector de fecha del propio navegador: en el celular abre
 * el calendario nativo, que el dueño ya sabe usar. El valor es la
 * fecha de Bogotá "AAAA-MM-DD"; con `permitirTodos`, "" = todos los días.
 * ============================================================= */

import { fechaBogota, fechaLarga } from '@/lib/panel';

export default function SelectorDia({
  dia,
  onCambiar,
  permitirTodos = false,
}: {
  dia: string;
  onCambiar: (dia: string) => void;
  permitirTodos?: boolean;
}) {
  const hoy = fechaBogota(new Date());
  const etiqueta = !dia ? 'Todos los días' : dia === hoy ? 'Hoy' : fechaLarga(dia);

  return (
    <div className="pn-dia">
      <label className="pn-dia-campo">
        <span className="pn-dia-texto">
          📅 <b>{etiqueta}</b>
        </span>
        <input
          type="date"
          value={dia}
          max={hoy}
          aria-label="Elegir un día"
          onChange={(e) => onCambiar(e.target.value || (permitirTodos ? '' : hoy))}
        />
      </label>
      {dia !== hoy && (
        <button type="button" className="pn-chip" onClick={() => onCambiar(hoy)}>
          Hoy
        </button>
      )}
      {permitirTodos && dia && (
        <button type="button" className="pn-chip" onClick={() => onCambiar('')}>
          Todos los días
        </button>
      )}
    </div>
  );
}
