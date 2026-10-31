'use client';

/* =============================================================
 * VENTAS DE UN DÍA CONCRETO (opción "Un día" del selector de periodo)
 *
 * Trae solo los pedidos de ese día (hora de Bogotá) y los resume en el
 * navegador con el mismo criterio que las funciones de la base: los
 * cancelados no cuentan y el ingreso por producto es unidades × precio
 * unitario guardado. Un día son pocos pedidos, así que no hace falta
 * otra función en Supabase.
 * ============================================================= */

import { useEffect, useState } from 'react';
import { supabaseNavegador } from '@/lib/supabase-navegador';
import { dinero } from '@/lib/pedidos-admin';
import { rangoDia, resumenDia, topDelDia, type ResumenDia } from '@/lib/panel';

type Fila = ReturnType<typeof topDelDia>[number];

export default function VentasDia({ dia, recargarToken }: { dia: string; recargarToken: number }) {
  const sb = supabaseNavegador();
  const [datos, setDatos] = useState<{ dia: string; resumen: ResumenDia; top: Fila[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    void (async () => {
      const r = rangoDia(dia);
      const { data, error: err } = await sb
        .from('orders')
        .select('created_at, status, subtotal, customer_phone, items')
        .gte('created_at', r.desde.toISOString())
        .lt('created_at', r.hasta.toISOString());
      if (!vigente) return;
      if (err) {
        setError('No se pudieron leer las ventas del día: ' + err.message);
        return;
      }
      setError(null);
      const filas = data ?? [];
      setDatos({ dia, resumen: resumenDia(filas, dia), top: topDelDia(filas, dia) });
    })();
    return () => {
      vigente = false;
    };
  }, [sb, dia, recargarToken]);

  if (error) return <p className="login-error">{error}</p>;
  if (!datos || datos.dia !== dia) return <p className="loading">Cargando ventas del día…</p>;

  const { resumen, top } = datos;
  return (
    <>
      <div className="kpis">
        {[
          ['Vendido', dinero(resumen.ventas)],
          ['Pedidos', String(resumen.pedidos)],
          ['Ticket promedio', dinero(resumen.ticket)],
          ['Clientes únicos', String(resumen.clientes)],
        ].map(([etiqueta, valor]) => (
          <div className="kpi" key={etiqueta}>
            <div className="kpi-num">{valor}</div>
            <div className="kpi-label">{etiqueta}</div>
          </div>
        ))}
      </div>

      {top.length === 0 ? (
        <p className="vt-vacio">Sin ventas ese día.</p>
      ) : (
        <table className="vt-tabla" style={{ marginTop: '1rem' }}>
          <caption className="vt-sub" style={{ textAlign: 'left', padding: '.6rem 0' }}>
            Productos vendidos ese día
          </caption>
          <thead>
            <tr>
              <th>Producto</th>
              <th>Unidades</th>
              <th>Ingreso</th>
            </tr>
          </thead>
          <tbody>
            {top.map((t) => (
              <tr key={t.producto}>
                <td>{t.producto}</td>
                <td>{t.unidades}</td>
                <td>{dinero(t.ingreso)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
