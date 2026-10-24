'use client';

/* =============================================================
 * PRECIOS DESDE VectorPOS
 *
 * El dueño sube la MISMA plantilla de productos que le envía al POS y
 * el panel ajusta los precios de la carta web. Tres pasos:
 *   1. Subir el Excel (se lee aquí, en el navegador: no viaja a ningún
 *      servidor).
 *   2. Revisar: qué platos cambian, de cuánto a cuánto, cuáles se ignoran
 *      y por qué. Las subidas/bajadas de más del 50% se resaltan.
 *   3. Aplicar lo marcado. Nada cambia sin este paso.
 * ============================================================= */

import { useEffect, useMemo, useState } from 'react';
import { supabaseNavegador } from '@/lib/supabase-navegador';
import { ADICIONES, COMBO_PRICE } from '@/data/menu';
import { MAPEO_POS } from '@/data/mapeo-pos';
import { leerXlsx } from '@/lib/xlsx-lite';
import { calcularCambios, interpretarTabla, type ProductoCarta, type Resultado } from '@/lib/precios-pos';
import { dinero } from '@/lib/pedidos-admin';
import { Icono } from '../Iconos';
import { Esqueleto } from './Animaciones';

type Fila = ProductoCarta & { data: Record<string, unknown> & ProductoCarta['data'] };

const EN_CODIGO = {
  combo: COMBO_PRICE,
  adiciones: Object.fromEntries(ADICIONES.map((a) => [a.name, a.price])),
};

export default function PreciosPos({ recargarToken }: { recargarToken: number }) {
  const sb = supabaseNavegador();
  const [carta, setCarta] = useState<Fila[] | null>(null);
  const [archivo, setArchivo] = useState<string | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [marcados, setMarcados] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [aplicando, setAplicando] = useState(false);
  const [hecho, setHecho] = useState<{ ok: number; fallos: string[] } | null>(null);

  useEffect(() => {
    let vigente = true;
    void (async () => {
      const { data, error: err } = await sb.from('menu_items').select('id, data');
      if (!vigente) return;
      if (err) setError('No se pudo leer el menú: ' + err.message);
      setCarta((data ?? []) as Fila[]);
    })();
    return () => {
      vigente = false;
    };
  }, [sb, recargarToken]);

  async function alElegir(f: File | undefined) {
    if (!f || !carta) return;
    setError(null);
    setHecho(null);
    setResultado(null);
    setArchivo(f.name);
    try {
      if (!/\.xlsx$/i.test(f.name)) throw new Error('Sube el archivo en formato Excel (.xlsx), el mismo que envías a VectorPOS.');
      const tabla = await leerXlsx(await f.arrayBuffer());
      const { filas, error: errTabla } = interpretarTabla(tabla);
      if (errTabla) throw new Error(errTabla);
      const r = calcularCambios(filas, carta, MAPEO_POS, EN_CODIGO);
      setResultado(r);
      setMarcados(r.cambios.map((c) => c.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo leer el Excel.');
    }
  }

  async function aplicar() {
    if (!resultado || !carta) return;
    const elegidos = resultado.cambios.filter((c) => marcados.includes(c.id));
    if (!elegidos.length) return;
    setAplicando(true);
    let ok = 0;
    const fallos: string[] = [];
    for (const c of elegidos) {
      const fila = carta.find((f) => f.id === c.id);
      if (!fila) continue;
      const data = { ...fila.data, options: c.nuevas };
      const { error: err } = await sb
        .from('menu_items')
        .update({ data, updated_at: new Date().toISOString() })
        .eq('id', c.id);
      if (err) fallos.push(`${c.nombre}: ${err.message}`);
      else {
        ok++;
        fila.data = data; // la próxima comparación parte del precio ya guardado
      }
    }
    setAplicando(false);
    setHecho({ ok, fallos });
    setResultado(null);
    setMarcados([]);
  }

  const totalOpciones = useMemo(
    () => (resultado?.cambios ?? []).filter((c) => marcados.includes(c.id)).reduce((n, c) => n + c.opciones.length, 0),
    [resultado, marcados],
  );

  return (
    <>
      <div className="panel-box pn-pos-intro">
        <h3>
          <Icono nombre="etiqueta" size={18} /> Actualizar precios desde VectorPOS
        </h3>
        <p className="pn-tenue pn-chico">
          Sube la <b>misma plantilla de productos</b> que le envías al POS. Te muestro qué precios de la carta web cambian
          y <b>no se aplica nada hasta que confirmes</b>. El archivo se lee aquí mismo, no se sube a ningún servidor.
        </p>

        {!carta ? (
          <Esqueleto lineas={2} />
        ) : (
          <label className="pn-subir">
            <input type="file" accept=".xlsx" onChange={(e) => void alElegir(e.target.files?.[0])} onClick={(e) => ((e.target as HTMLInputElement).value = '')} />
            <Icono nombre="subir" size={28} />
            <b>{archivo ? 'Subir otro Excel' : 'Elegir el Excel'}</b>
            <small>{archivo ?? 'Plantilla_Productos.xlsx'}</small>
          </label>
        )}

        {error && <p className="login-error">{error}</p>}
        {hecho && (
          <p className={hecho.fallos.length ? 'login-error' : 'pn-pos-ok'}>
            {hecho.ok > 0 && `✅ ${hecho.ok} ${hecho.ok === 1 ? 'plato actualizado' : 'platos actualizados'}. La web pública los muestra en menos de un minuto.`}
            {hecho.fallos.map((f) => (
              <span key={f}>
                <br />❌ {f}
              </span>
            ))}
          </p>
        )}
      </div>

      {resultado && (
        <>
          <div className="pn-pos-resumen">
            <span className="pn-pos-chip is-cambia">{resultado.cambios.length} cambian</span>
            <span className="pn-pos-chip">{resultado.sinCambio} sin cambio</span>
            <span className="pn-pos-chip">{resultado.ignorados.length} no están en la web</span>
            {resultado.errores.length > 0 && <span className="pn-pos-chip is-error">{resultado.errores.length} para revisar</span>}
          </div>

          {resultado.cambios.length === 0 ? (
            <div className="panel-box">
              <p className="empty-state">✅ Los precios de la web ya coinciden con el Excel. No hay nada que cambiar.</p>
            </div>
          ) : (
            <div className="panel-box">
              <div className="pn-tarjeta-cab">
                <h3>Precios que cambian</h3>
                <button
                  type="button"
                  className="pn-enlace"
                  onClick={() => setMarcados(marcados.length === resultado.cambios.length ? [] : resultado.cambios.map((c) => c.id))}
                >
                  {marcados.length === resultado.cambios.length ? 'Desmarcar todo' : 'Marcar todo'}
                </button>
              </div>

              <ul className="pn-pos-lista">
                {resultado.cambios.map((c) => (
                  <li key={c.id} className={c.alerta ? 'is-alerta' : ''}>
                    <label>
                      <input
                        type="checkbox"
                        checked={marcados.includes(c.id)}
                        onChange={() => setMarcados((m) => (m.includes(c.id) ? m.filter((x) => x !== c.id) : [...m, c.id]))}
                      />
                      <b>{c.nombre}</b>
                      {c.alerta && <span className="pn-pos-alerta">⚠️ cambio grande, revísalo</span>}
                    </label>
                    <div className="pn-pos-opciones">
                      {c.opciones.map((o) => {
                        const d = o.despues - o.antes;
                        return (
                          <span key={o.label}>
                            {o.label}
                            {o.arrastrada && <small title="Se movió lo mismo que la opción del POS"> (se ajusta igual)</small>}:{' '}
                            <s>{dinero(o.antes)}</s> → <b>{dinero(o.despues)}</b>{' '}
                            <em className={d > 0 ? 'sube' : 'baja'}>
                              {d > 0 ? '+' : '−'}
                              {dinero(Math.abs(d))}
                            </em>
                          </span>
                        );
                      })}
                    </div>
                  </li>
                ))}
              </ul>

              <div className="pn-pos-aplicar">
                <span className="pn-tenue pn-chico">
                  {marcados.length} {marcados.length === 1 ? 'plato' : 'platos'} · {totalOpciones} {totalOpciones === 1 ? 'precio' : 'precios'}
                </span>
                <button type="button" className="btn-primary" disabled={!marcados.length || aplicando} onClick={() => void aplicar()}>
                  {aplicando ? 'Aplicando…' : `Aplicar ${marcados.length} ${marcados.length === 1 ? 'cambio' : 'cambios'}`}
                </button>
              </div>
            </div>
          )}

          {resultado.avisos.length > 0 && (
            <div className="panel-box pn-pos-avisos">
              <h3>⚠️ Cambiaron precios que no se ajustan solos</h3>
              <p className="pn-tenue pn-chico">
                El combo y las adiciones están en el código de la página. Pídele a tu desarrollador que los actualice:
              </p>
              <ul>
                {resultado.avisos.map((a) => (
                  <li key={a.concepto}>
                    {a.concepto}: <s>{dinero(a.actual)}</s> → <b>{dinero(a.nuevo)}</b>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {resultado.errores.length > 0 && (
            <div className="panel-box">
              <h3>Para revisar ({resultado.errores.length})</h3>
              <ul className="pn-pos-ignorados">
                {resultado.errores.map((e) => (
                  <li key={e.codigo + e.motivo}>
                    <code>{e.codigo}</code> {e.nombre} — <span className="pn-tenue">{e.motivo}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {resultado.ignorados.length > 0 && (
            <details className="panel-box pn-pos-detalles">
              <summary>No están en la carta web ({resultado.ignorados.length}) — se ignoran</summary>
              <ul className="pn-pos-ignorados">
                {resultado.ignorados.map((e) => (
                  <li key={e.codigo}>
                    <code>{e.codigo}</code> {e.nombre}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </>
  );
}
