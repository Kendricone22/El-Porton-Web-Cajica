'use client';

/* =============================================================
 * ¿DE DÓNDE LLEGAN? (sección Visitas)
 *
 * Agrupa las visitas de los últimos 30 días por origen: la etiqueta del
 * enlace (instagram, qr-bolsa…) o el dominio de donde vino la persona
 * (google.com…). Sin origen = "Directo".
 *
 * Se agrupa en el navegador, pidiendo las filas por páginas de 1000
 * (el tope de la API). Hasta 10 páginas = 10.000 vistas en 30 días, muy
 * por encima de lo que mueve un restaurante; si algún día se supera, se
 * avisa en pantalla en vez de mostrar números recortados sin decirlo.
 * ============================================================= */

import { useEffect, useState } from 'react';
import { supabaseNavegador } from '@/lib/supabase-navegador';
import { agruparPorOrigen, type FilaOrigen } from '@/lib/rastreo';
import { Esqueleto } from './Animaciones';

const PAGINA = 1000;
const MAX_PAGINAS = 10;
const DIAS = 30;

export default function Origenes({ recargarToken }: { recargarToken: number }) {
  const sb = supabaseNavegador();
  const [filas, setFilas] = useState<FilaOrigen[] | null>(null);
  const [recortado, setRecortado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    void (async () => {
      const desde = new Date(Date.now() - DIAS * 864e5).toISOString();
      const todas: { session_id: string; visitor_id: string; referrer: string | null }[] = [];
      let completo = false;

      for (let p = 0; p < MAX_PAGINAS; p++) {
        const { data, error: err } = await sb
          .from('visits')
          .select('session_id, visitor_id, referrer')
          .gte('created_at', desde)
          .order('id', { ascending: true })
          .range(p * PAGINA, p * PAGINA + PAGINA - 1);
        if (!vigente) return;
        if (err) {
          setError('No se pudieron leer las visitas: ' + err.message);
          setFilas([]);
          return;
        }
        todas.push(...(data ?? []));
        if ((data?.length ?? 0) < PAGINA) {
          completo = true;
          break;
        }
      }

      setError(null);
      setRecortado(!completo);
      setFilas(agruparPorOrigen(todas));
    })();
    return () => {
      vigente = false;
    };
  }, [sb, recargarToken]);

  const maximo = Math.max(1, ...(filas ?? []).map((f) => f.visitas));

  return (
    <div className="panel-box">
      <h3>¿De dónde llegan? · últimos {DIAS} días</h3>

      {!filas ? (
        <Esqueleto lineas={4} />
      ) : error ? (
        <p className="login-error">{error}</p>
      ) : !filas.length ? (
        <p className="empty-state">Todavía no hay visitas registradas.</p>
      ) : (
        <ul className="pn-origenes">
          {filas.map((f) => (
            <li key={f.origen}>
              <span className="pn-origen-nombre">{f.origen}</span>
              <span className="pn-origen-barra">
                <i style={{ width: `${(f.visitas / maximo) * 100}%` }} />
              </span>
              <span className="pn-origen-num">
                <b>{f.visitas}</b> {f.visitas === 1 ? 'visita' : 'visitas'}
                <small>
                  {f.personas} {f.personas === 1 ? 'persona' : 'personas'}
                </small>
              </span>
            </li>
          ))}
        </ul>
      )}

      {recortado && (
        <p className="pn-tenue pn-chico">Se muestran las primeras {PAGINA * MAX_PAGINAS} vistas del periodo.</p>
      )}

      <p className="pn-tenue pn-chico pn-consejo">
        <b>Truco:</b> agrega <code>?utm_source=nombre</code> al final del enlace según dónde lo pongas (por ejemplo{' '}
        <code>?utm_source=instagram</code> en la bio o <code>?utm_source=qr-bolsa</code> en el código QR de las
        bolsas) y aquí verás cuál trae más gente. &quot;Directo&quot; incluye a quien abre el enlace desde WhatsApp.
      </p>
    </div>
  );
}
