'use client';

/* =============================================================
 * VISTA "TABLA" DEL MENÚ (formato de hoja de cálculo)
 *
 * Una fila por plato, todo editable ahí mismo: nombre, precio de cada
 * opción, descripción y disponible/agotado. Los cambios NO se guardan al
 * escribir: las celdas tocadas se resaltan y se guardan juntas con
 * "Guardar cambios" (o se descartan). Con las casillas se suben/bajan
 * precios o se agotan varios platos a la vez.
 *
 * Al guardar se conserva todo lo demás del plato (foto, combo, sabores…),
 * igual que el editor de producto.
 * ============================================================= */

import { useMemo, useState } from 'react';
import { supabaseNavegador } from '@/lib/supabase-navegador';
import { CATEGORIES } from '@/data/menu';
import { etiquetaCategoria, emojiCategoria, type FilaMenu } from '@/lib/menu-admin';
import {
  ajustarPrecio,
  borradorDe,
  camposCambiados,
  dataNueva,
  erroresDe,
  paraBuscar,
  type Ajuste,
  type Borrador,
  type DatosFila,
} from '@/lib/tabla-menu';
import { aPrecio } from '@/lib/precios-pos';

export default function TablaMenu({
  filas,
  alGuardar,
}: {
  filas: FilaMenu[];
  /** Devuelve las filas ya guardadas para que el menú se actualice. */
  alGuardar: (actualizadas: FilaMenu[]) => void;
}) {
  const sb = supabaseNavegador();
  /* Solo existen borradores de las filas que se han tocado. */
  const [borradores, setBorradores] = useState<Record<string, Borrador>>({});
  const [seleccion, setSeleccion] = useState<string[]>([]);
  const [buscar, setBuscar] = useState('');
  const [cat, setCat] = useState('todas');
  const [ajuste, setAjuste] = useState<Ajuste>({ tipo: 'porcentaje', valor: 5 });
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const borrador = (f: FilaMenu): Borrador => borradores[f.id] ?? borradorDe(f.data as DatosFila, f.available);
  const editar = (f: FilaMenu, cambio: Partial<Borrador>) => {
    setAviso(null);
    setBorradores((b) => ({ ...b, [f.id]: { ...borrador(f), ...cambio } }));
  };

  const visibles = useMemo(() => {
    const q = paraBuscar(buscar.trim());
    // Mismo orden que la carta: por categoría y luego por posición.
    const orden = (c: string) => {
      const i = CATEGORIES.findIndex((x) => x.key === c);
      return i < 0 ? 999 : i;
    };
    return filas
      .filter(
        (f) =>
          (cat === 'todas' || f.cat === cat) &&
          (!q || paraBuscar(`${f.data?.name ?? ''} ${f.data?.desc ?? ''} ${f.id}`).includes(q)),
      )
      .sort((a, b) => orden(a.cat) - orden(b.cat) || a.sort_order - b.sort_order);
  }, [filas, buscar, cat]);

  /* Filas con cambios reales (un borrador puede haber vuelto a su valor original). */
  const sucias = filas.filter((f) => borradores[f.id] && camposCambiados(f.data as DatosFila, f.available, borradores[f.id]).size > 0);

  const todasMarcadas = visibles.length > 0 && visibles.every((f) => seleccion.includes(f.id));
  const marcar = (id: string) => setSeleccion((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  function aplicarAMarcadas(fn: (f: FilaMenu, b: Borrador) => Partial<Borrador>) {
    setAviso(null);
    setBorradores((prev) => {
      const nuevo = { ...prev };
      for (const f of filas) {
        if (!seleccion.includes(f.id)) continue;
        const b = prev[f.id] ?? borradorDe(f.data as DatosFila, f.available);
        nuevo[f.id] = { ...b, ...fn(f, b) };
      }
      return nuevo;
    });
  }

  async function guardar() {
    // Validar todo antes de escribir nada.
    for (const f of sucias) {
      const errs = erroresDe(borradores[f.id], (f.data?.options ?? []).map((o) => o.label));
      if (errs.length) {
        setAviso({ tipo: 'error', texto: `${f.data?.name || f.id}: ${errs.join(' · ')}` });
        return;
      }
    }
    setGuardando(true);
    const guardadas: FilaMenu[] = [];
    const fallos: string[] = [];
    for (const f of sucias) {
      const b = borradores[f.id];
      const data = dataNueva(f.data as DatosFila, b);
      const { error } = await sb
        .from('menu_items')
        .update({ available: b.available, data, updated_at: new Date().toISOString() })
        .eq('id', f.id);
      if (error) fallos.push(`${f.data?.name || f.id}: ${error.message}`);
      else guardadas.push({ ...f, available: b.available, data: data as FilaMenu['data'] });
    }
    setGuardando(false);
    setBorradores((b) => {
      const resto = { ...b };
      for (const g of guardadas) delete resto[g.id];
      return resto;
    });
    if (guardadas.length) alGuardar(guardadas);
    setAviso(
      fallos.length
        ? { tipo: 'error', texto: `Se guardaron ${guardadas.length}. Fallaron: ${fallos.join(' · ')}` }
        : { tipo: 'ok', texto: `✅ ${guardadas.length} ${guardadas.length === 1 ? 'producto guardado' : 'productos guardados'}. La web los muestra en menos de un minuto.` },
    );
  }

  return (
    <div className="pn-tabla-menu">
      {/* ---------- barra superior ---------- */}
      <div className="pn-tm-barra">
        <input
          className="pn-tm-buscar"
          type="search"
          placeholder="Buscar plato o ingrediente…"
          value={buscar}
          onChange={(e) => setBuscar(e.target.value)}
        />
        <select className="pn-tm-select" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Categoría">
          <option value="todas">Todas las categorías</option>
          {CATEGORIES.map((c) => (
            <option key={c.key} value={c.key}>
              {c.emoji} {c.label}
            </option>
          ))}
        </select>
      </div>

      {/* ---------- acciones sobre las marcadas ---------- */}
      <div className={`pn-tm-masivo${seleccion.length ? ' is-activo' : ''}`}>
        <b>{seleccion.length ? `${seleccion.length} marcados` : 'Marca productos para cambiarlos en grupo'}</b>
        <span className="pn-tm-ajuste">
          <select
            value={ajuste.tipo}
            onChange={(e) => setAjuste({ ...ajuste, tipo: e.target.value as Ajuste['tipo'] })}
            aria-label="Tipo de ajuste"
          >
            <option value="porcentaje">%</option>
            <option value="monto">$</option>
          </select>
          <input
            type="number"
            value={ajuste.valor}
            onChange={(e) => setAjuste({ ...ajuste, valor: Number(e.target.value) })}
            aria-label="Cantidad del ajuste"
          />
          <button
            type="button"
            className="mi-btn"
            disabled={!seleccion.length || !ajuste.valor}
            onClick={() =>
              aplicarAMarcadas((f, b) => ({
                precios: b.precios.map((p, i) => String(ajustarPrecio(aPrecio(p) ?? f.data?.options?.[i]?.price ?? 0, ajuste))),
              }))
            }
          >
            {ajuste.valor >= 0 ? 'Subir' : 'Bajar'} precios
          </button>
        </span>
        <button type="button" className="mi-btn" disabled={!seleccion.length} onClick={() => aplicarAMarcadas(() => ({ available: false }))}>
          Agotar
        </button>
        <button type="button" className="mi-btn" disabled={!seleccion.length} onClick={() => aplicarAMarcadas(() => ({ available: true }))}>
          Reactivar
        </button>
        {seleccion.length > 0 && (
          <button type="button" className="pn-enlace" onClick={() => setSeleccion([])}>
            Quitar marcas
          </button>
        )}
      </div>

      {/* ---------- tabla ---------- */}
      <div className="pn-tm-wrap">
        <table className="pn-tm">
          <thead>
            <tr>
              <th className="pn-tm-check">
                <input
                  type="checkbox"
                  checked={todasMarcadas}
                  aria-label="Marcar todos los visibles"
                  onChange={() =>
                    setSeleccion(todasMarcadas ? seleccion.filter((id) => !visibles.some((f) => f.id === id)) : [...new Set([...seleccion, ...visibles.map((f) => f.id)])])
                  }
                />
              </th>
              <th>Nombre</th>
              <th>Categoría</th>
              <th>Precios</th>
              <th>Descripción</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((f) => {
              const b = borrador(f);
              const cambios = borradores[f.id] ? camposCambiados(f.data as DatosFila, f.available, b) : new Set<string>();
              const opciones = f.data?.options ?? [];
              return (
                <tr key={f.id} className={`${cambios.size ? 'is-sucia' : ''}${seleccion.includes(f.id) ? ' is-marcada' : ''}`}>
                  <td className="pn-tm-check">
                    <input type="checkbox" checked={seleccion.includes(f.id)} onChange={() => marcar(f.id)} aria-label={`Marcar ${b.name}`} />
                  </td>
                  <td>
                    <input
                      className={`pn-tm-input${cambios.has('name') ? ' is-cambiado' : ''}`}
                      value={b.name}
                      onChange={(e) => editar(f, { name: e.target.value })}
                      aria-label="Nombre"
                    />
                  </td>
                  <td className="pn-tm-cat">
                    {emojiCategoria(f.cat, CATEGORIES)} {etiquetaCategoria(f.cat, CATEGORIES)}
                  </td>
                  <td>
                    <div className="pn-tm-precios">
                      {opciones.map((o, i) => (
                        <label key={o.label} className={cambios.has('precio:' + i) ? 'is-cambiado' : ''}>
                          {opciones.length > 1 && <span>{o.label}</span>}
                          <input
                            className={aPrecio(b.precios[i]) === null ? 'is-invalido' : ''}
                            inputMode="numeric"
                            value={b.precios[i] ?? ''}
                            onChange={(e) => {
                              const precios = [...b.precios];
                              precios[i] = e.target.value;
                              editar(f, { precios });
                            }}
                            aria-label={`Precio ${o.label}`}
                          />
                        </label>
                      ))}
                    </div>
                  </td>
                  <td>
                    <textarea
                      className={`pn-tm-input pn-tm-desc${cambios.has('desc') ? ' is-cambiado' : ''}`}
                      rows={2}
                      value={b.desc}
                      onChange={(e) => editar(f, { desc: e.target.value })}
                      aria-label="Descripción"
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className={`pn-tm-estado${b.available ? ' is-disponible' : ''}${cambios.has('available') ? ' is-cambiado' : ''}`}
                      onClick={() => editar(f, { available: !b.available })}
                    >
                      {b.available ? 'Disponible' : 'Agotado'}
                    </button>
                  </td>
                </tr>
              );
            })}
            {!visibles.length && (
              <tr>
                <td colSpan={6} className="empty-state">
                  Ningún plato coincide con la búsqueda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ---------- guardar ---------- */}
      {(sucias.length > 0 || aviso) && (
        <div className="pn-tm-guardar">
          {aviso && <span className={aviso.tipo === 'ok' ? 'pn-pos-ok' : 'login-error'}>{aviso.texto}</span>}
          {sucias.length > 0 && (
            <>
              <span className="pn-tenue pn-chico">
                {sucias.length} {sucias.length === 1 ? 'producto con cambios' : 'productos con cambios'} sin guardar
              </span>
              <button type="button" className="mi-btn" disabled={guardando} onClick={() => { setBorradores({}); setAviso(null); }}>
                Descartar
              </button>
              <button type="button" className="btn-primary" disabled={guardando} onClick={() => void guardar()}>
                {guardando ? 'Guardando…' : `Guardar ${sucias.length} ${sucias.length === 1 ? 'cambio' : 'cambios'}`}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
