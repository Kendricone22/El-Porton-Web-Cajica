'use client';

/* =============================================================
 * PESTAÑA DE MENÚ (editor del catálogo)
 *
 * Lee y escribe la tabla `menu_items`. El público la lee fusionada con
 * el menú del código (`obtenerMenu`), así que:
 *
 *   · "Agotar" oculta el plato de la carta al instante.
 *   · Borrar una fila NO quita el plato de la web si sigue existiendo
 *     en `src/data/menu.ts`: volverá a aparecer en la siguiente carga. Para
 *     esconderlo de verdad hay que usar "Agotar". Está avisado en la
 *     confirmación de borrado, cosa que v1 no hace.
 * ============================================================= */

import { useCallback, useEffect, useState } from 'react';
import { supabaseNavegador } from '@/lib/supabase-navegador';
import { CATEGORIES, MENU } from '@/data/menu';
import {
  agruparPorCategoria,
  emojiCategoria,
  etiquetaCategoria,
  textoPrecio,
  type FilaMenu,
} from '@/lib/menu-admin';
import ModalMenu from './ModalMenu';
import { Icono } from '../Iconos';

type Vista = 'lista' | 'iconos';
const CLAVE_VISTA = 'porton_panel_menu_vista';
const CLAVE_PLEGADAS = 'porton_panel_menu_plegadas';

function leerPref<T>(clave: string, porDefecto: T): T {
  try {
    const v = localStorage.getItem(clave);
    return v ? (JSON.parse(v) as T) : porDefecto;
  } catch {
    return porDefecto;
  }
}
function guardarPref(clave: string, valor: unknown) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    /* sin almacenamiento: la preferencia dura solo esta sesión */
  }
}

export default function Menu({
  recargarToken,
  iniciarCreando = false,
}: {
  recargarToken: number;
  /** Si viene del botón "Nuevo producto" del inicio, abre el formulario de alta. */
  iniciarCreando?: boolean;
}) {
  const sb = supabaseNavegador();
  const [filas, setFilas] = useState<FilaMenu[] | null>(null);
  const [cargando, setCargando] = useState(true);
  const [errorTabla, setErrorTabla] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [importando, setImportando] = useState(false);
  /** null = cerrado · 'nuevo' = alta · FilaMenu = edición. */
  const [editando, setEditando] = useState<FilaMenu | 'nuevo' | null>(iniciarCreando ? 'nuevo' : null);
  /* Preferencias de vista: se recuerdan en este navegador. El panel solo
     se pinta en el cliente (detrás del inicio de sesión), así que leer
     localStorage aquí no provoca diferencias con el servidor. */
  const [vista, setVista] = useState<Vista>(() => leerPref<Vista>(CLAVE_VISTA, 'lista'));
  const [plegadas, setPlegadas] = useState<string[]>(() => leerPref<string[]>(CLAVE_PLEGADAS, []));

  function cambiarVista(v: Vista) {
    setVista(v);
    guardarPref(CLAVE_VISTA, v);
  }
  function fijarPlegadas(cats: string[]) {
    setPlegadas(cats);
    guardarPref(CLAVE_PLEGADAS, cats);
  }
  const alternarCategoria = (cat: string) =>
    fijarPlegadas(plegadas.includes(cat) ? plegadas.filter((c) => c !== cat) : [...plegadas, cat]);

  const cargar = useCallback(async () => {
    setCargando(true);
    setErrorTabla(null);
    setAviso(null);

    const { data, error } = await sb.from('menu_items').select('*').order('cat').order('sort_order');
    setCargando(false);

    if (error) {
      setErrorTabla(error.message);
      return;
    }
    setFilas((data ?? []) as FilaMenu[]);
  }, [sb]);

  useEffect(() => {
    void cargar();
  }, [cargar, recargarToken]);

  async function importar() {
    setImportando(true);
    setAviso(null);

    const filasNuevas = MENU.map((item, i) => ({
      id: item.id,
      cat: item.cat,
      sort_order: i,
      available: item.available !== false,
      data: item,
    }));

    /* `ignoreDuplicates` es lo que hace esto seguro: si un plato ya
       existe, NO se pisa. Así el botón se puede pulsar mil veces sin
       borrar las ediciones que el dueño ya hizo. */
    const { error } = await sb.from('menu_items').upsert(filasNuevas, {
      onConflict: 'id',
      ignoreDuplicates: true,
    });

    setImportando(false);
    if (error) {
      setAviso('No se pudo importar: ' + error.message);
      return;
    }
    await cargar();
  }

  async function alternarDisponible(f: FilaMenu) {
    const siguiente = !f.available;
    const nuevaData = { ...f.data, available: siguiente };

    setFilas((fs) => fs?.map((x) => (x.id === f.id ? { ...x, available: siguiente, data: nuevaData } : x)) ?? null);

    const { error } = await sb
      .from('menu_items')
      .update({ available: siguiente, data: nuevaData, updated_at: new Date().toISOString() })
      .eq('id', f.id);

    if (error) {
      // Se revierte: si no, el panel muestra un estado que la base no tiene.
      setFilas((fs) => fs?.map((x) => (x.id === f.id ? f : x)) ?? null);
      setAviso('No se pudo cambiar: ' + error.message);
    }
  }

  async function borrar(f: FilaMenu) {
    const sigueEnElCodigo = MENU.some((m) => m.id === f.id);
    const nombre = f.data?.name ?? f.id;

    const mensaje = sigueEnElCodigo
      ? `¿Borrar "${nombre}" del menú?\n\nOJO: este plato también existe en el código de la página, así que VOLVERÁ A APARECER en la próxima carga. Para esconderlo de verdad usa "Agotar".`
      : `¿Borrar "${nombre}" del menú? Esto no se puede deshacer.`;

    if (!confirm(mensaje)) return;

    const { error } = await sb.from('menu_items').delete().eq('id', f.id);
    if (error) {
      setAviso('No se pudo borrar: ' + error.message);
      return;
    }
    setFilas((fs) => fs?.filter((x) => x.id !== f.id) ?? null);
  }

  if (cargando) return <p className="loading">Cargando menú…</p>;

  if (errorTabla) {
    return (
      <div className="menu-onboard">
        <p className="menu-onboard-emoji">🛠️</p>
        <p className="menu-onboard-title">Falta preparar la tabla del menú</p>
        <p className="menu-onboard-sub">
          Corre primero <code>db/menu-setup.sql</code> en Supabase (reemplazando el correo admin).
          Detalle técnico: {errorTabla}
        </p>
      </div>
    );
  }

  if (!filas?.length) {
    return (
      <div className="menu-onboard">
        <p className="menu-onboard-emoji">🍔</p>
        <p className="menu-onboard-title">El menú todavía está vacío</p>
        <p className="menu-onboard-sub">
          Importa los {MENU.length} productos actuales de la página con un clic. Después podrás editar
          precios y descripciones, marcar como agotado, agregar o borrar productos.
        </p>
        {aviso && <p className="login-error">{aviso}</p>}
        <button
          type="button"
          className="btn-primary"
          style={{ maxWidth: '22rem', margin: '1.2rem auto 0' }}
          onClick={() => void importar()}
          disabled={importando}
        >
          {importando ? 'Importando…' : '⬇️ Importar menú actual'}
        </button>
      </div>
    );
  }

  const grupos = agruparPorCategoria(filas, CATEGORIES);

  return (
    <>
      <div className="menu-toolbar pn-menu-barra">
        <span className="menu-count">{filas.length} productos en el menú</span>

        <div className="pn-menu-controles">
          <button
            type="button"
            className="pn-enlace"
            onClick={() => fijarPlegadas(plegadas.length >= grupos.length ? [] : grupos.map((g) => g.cat))}
          >
            {plegadas.length >= grupos.length ? 'Desplegar todo' : 'Plegar todo'}
          </button>

          <div className="pn-segmento" role="group" aria-label="Vista del menú">
            <button
              type="button"
              className={vista === 'lista' ? 'is-activo' : ''}
              aria-pressed={vista === 'lista'}
              onClick={() => cambiarVista('lista')}
              title="Lista"
            >
              <Icono nombre="hamburguesaMenu" size={16} /> Lista
            </button>
            <button
              type="button"
              className={vista === 'iconos' ? 'is-activo' : ''}
              aria-pressed={vista === 'iconos'}
              onClick={() => cambiarVista('iconos')}
              title="Iconos medianos"
            >
              <Icono nombre="cuadricula" size={16} /> Iconos
            </button>
          </div>

          <button type="button" className="btn-primary mi-add" onClick={() => setEditando('nuevo')}>
            ➕ Agregar producto
          </button>
        </div>
      </div>

      {aviso && <p className="login-error">{aviso}</p>}

      {grupos.map((g) => {
        const plegada = plegadas.includes(g.cat);
        const agotados = g.filas.filter((f) => !f.available).length;
        return (
        <div className={`menu-cat-group pn-cat${plegada ? ' is-plegada' : ''}`} key={g.cat}>
          <h3 className="menu-cat-title">
            <button
              type="button"
              className="pn-cat-boton"
              aria-expanded={!plegada}
              onClick={() => alternarCategoria(g.cat)}
            >
              <Icono nombre="chevron" size={16} className="pn-cat-flecha" />
              {emojiCategoria(g.cat, CATEGORIES)} {etiquetaCategoria(g.cat, CATEGORIES)}{' '}
              <span>({g.filas.length})</span>
              {agotados > 0 && <span className="out-pill">{agotados} agotado{agotados > 1 ? 's' : ''}</span>}
            </button>
          </h3>

          {!plegada && (
          <div className={vista === 'iconos' ? 'pn-menu-rejilla' : 'pn-menu-lista'}>
          {g.filas.map((f) => {
            const d = f.data ?? {};
            return (
              <div className={`menu-item${f.available ? '' : ' is-out'}`} key={f.id}>
                {d.img ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img className="menu-item-thumb" src={d.img} alt="" />
                ) : (
                  <span className="menu-item-thumb menu-item-thumb--emoji">{d.emoji || '🍽️'}</span>
                )}

                <div className="menu-item-info">
                  <span className="menu-item-name">
                    {d.emoji ? d.emoji + ' ' : ''}
                    {d.name || f.id}
                    {!f.available && <span className="out-pill">AGOTADO</span>}
                  </span>
                  <span className="menu-item-price">{textoPrecio(d.options)}</span>
                </div>

                <div className="menu-item-actions">
                  <button type="button" className="mi-btn mi-toggle" onClick={() => void alternarDisponible(f)}>
                    {f.available ? 'Agotar' : 'Reactivar'}
                  </button>
                  <button type="button" className="mi-btn mi-edit" onClick={() => setEditando(f)}>
                    Editar
                  </button>
                  <button type="button" className="mi-btn mi-del" onClick={() => void borrar(f)}>
                    Borrar
                  </button>
                </div>
              </div>
            );
          })}
          </div>
          )}
        </div>
        );
      })}

      {editando && (
        <ModalMenu
          fila={editando === 'nuevo' ? null : editando}
          idsUsados={filas.map((f) => f.id)}
          alCerrar={() => setEditando(null)}
          alGuardar={(f, esNuevo) => {
            setFilas((fs) => (esNuevo ? [...(fs ?? []), f] : (fs ?? []).map((x) => (x.id === f.id ? f : x))));
            setEditando(null);
          }}
        />
      )}
    </>
  );
}
