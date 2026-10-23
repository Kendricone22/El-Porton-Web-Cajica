'use client';

/* =============================================================
 * PANEL ADMINISTRATIVO
 *
 * Todo el panel es de cliente, y aquí sí es lo correcto: está detrás
 * de un inicio de sesión, no lo indexa nadie y es interacción de
 * principio a fin. Es justo lo contrario de la página pública.
 *
 * ⚠️ Lo que llega al navegador SIN sesión es un formulario y nada más:
 * los datos se piden después de autenticarse, y quien los protege son
 * las políticas RLS de la base — no el hecho de esconder la pantalla.
 *
 * Rediseño 2026-10 (prototipo del cliente): menú lateral + cabecera +
 * inicio con resumen. El menú lateral muestra SOLO secciones que
 * funcionan de verdad (decisión del cliente): nada de botones vacíos.
 * Fondo liso como el prototipo (el cliente pidió quitar los puntos
 * interactivos que había antes).
 * ============================================================= */

import { useEffect, useState } from 'react';
import { useSesionAdmin } from '@/estado/sesion-admin';
import { supabaseNavegador } from '@/lib/supabase-navegador';
import { estadoEn } from '@/lib/horario';
import { fechaLarga } from '@/lib/panel';
import { Login, RetoMFA } from '@/componentes/admin/Acceso';
import Pedidos from '@/componentes/admin/Pedidos';
import Analitica from '@/componentes/admin/Analitica';
import Visitas from '@/componentes/admin/Visitas';
import Menu from '@/componentes/admin/Menu';
import Resumen, { type Seccion } from '@/componentes/admin/Resumen';
import ModalSeguridad from '@/componentes/admin/ModalSeguridad';
import { Icono, type NombreIcono } from '@/componentes/Iconos';

const TITULOS: Record<Seccion, { titulo: string; sub: string }> = {
  inicio: { titulo: 'Inicio', sub: 'Resumen general de tu negocio' },
  pedidos: { titulo: 'Pedidos', sub: 'Cambia el estado de cada pedido con un toque' },
  menu: { titulo: 'Menú', sub: 'Precios, fotos, descripciones y platos agotados' },
  ventas: { titulo: 'Ventas', sub: 'Ingresos, productos más vendidos y exportación' },
  visitas: { titulo: 'Visitas', sub: 'Cuántas personas entran a la web' },
};

const GRUPOS: { titulo?: string; items: { id: Seccion; texto: string; icono: NombreIcono }[] }[] = [
  { items: [{ id: 'inicio', texto: 'Inicio', icono: 'inicio' }] },
  {
    titulo: 'Gestión',
    items: [
      { id: 'pedidos', texto: 'Pedidos', icono: 'pedidos' },
      { id: 'menu', texto: 'Menú', icono: 'carta' },
    ],
  },
  {
    titulo: 'Analítica',
    items: [
      { id: 'ventas', texto: 'Ventas', icono: 'grafica' },
      { id: 'visitas', texto: 'Visitas', icono: 'ojo' },
    ],
  },
];

export default function PanelAdmin() {
  const { estado, correo, factorId, error, revisar, salir } = useSesionAdmin();
  const [seccion, setSeccion] = useState<Seccion>('inicio');
  /* Cambiar este número hace que las secciones vuelvan a pedir sus datos.
     Es más simple que pasar una función de recarga a cada una. */
  const [recargarToken, setRecargar] = useState(0);
  const [seguridadAbierta, setSeguridadAbierta] = useState(false);
  const [lateralAbierto, setLateralAbierto] = useState(false);
  const [creandoProducto, setCreandoProducto] = useState(false);
  const [nuevos, setNuevos] = useState<number | null>(null);
  const [contadorToken, setContadorToken] = useState(0);

  /* Pedidos sin atender: la insignia del menú y la campana. Se pide solo
     el número (head: true), no las filas. */
  useEffect(() => {
    if (estado !== 'dentro') return;
    let vigente = true;
    void (async () => {
      const { count } = await supabaseNavegador()
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'nuevo');
      if (vigente) setNuevos(count ?? 0);
    })();
    return () => {
      vigente = false;
    };
  }, [estado, recargarToken, contadorToken]);

  if (estado === 'cargando') {
    return (
      <>
        <div id="login-view" className="admin-login">
          <p className="loading">Cargando…</p>
        </div>
      </>
    );
  }

  if (estado === 'fuera') {
    return (
      <>
        <Login alEntrar={revisar} avisoPrevio={error} />
      </>
    );
  }

  if (estado === 'mfa' && factorId) {
    return (
      <>
        <RetoMFA factorId={factorId} alVerificar={revisar} alCancelar={salir} />
      </>
    );
  }

  function ir(s: Seccion) {
    setCreandoProducto(false);
    setSeccion(s);
    setLateralAbierto(false);
    window.scrollTo({ top: 0 });
  }

  const tienda = estadoEn();
  const { titulo, sub } = TITULOS[seccion];

  return (
    <>
      <div id="dash-view" className="pn">
        {/* ---------- menú lateral ---------- */}
        <aside className={`pn-lateral${lateralAbierto ? ' is-abierto' : ''}`} aria-label="Menú del panel">
          <div className="pn-lateral-logo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/logo-final.png" alt="El Portón" />
          </div>

          <nav className="pn-nav">
            {GRUPOS.map((g, i) => (
              <div key={i} className="pn-nav-grupo">
                {g.titulo && <p className="pn-nav-titulo">{g.titulo}</p>}
                {g.items.map((it) => (
                  <button
                    key={it.id}
                    type="button"
                    className={`pn-nav-item${seccion === it.id ? ' is-activo' : ''}`}
                    aria-current={seccion === it.id ? 'page' : undefined}
                    onClick={() => ir(it.id)}
                  >
                    <Icono nombre={it.icono} size={19} />
                    <span>{it.texto}</span>
                    {it.id === 'pedidos' && !!nuevos && <span className="pn-insignia">{nuevos}</span>}
                  </button>
                ))}
              </div>
            ))}

            <div className="pn-nav-grupo">
              <p className="pn-nav-titulo">Cuenta</p>
              <button type="button" className="pn-nav-item" onClick={() => setSeguridadAbierta(true)}>
                <Icono nombre="candado" size={19} />
                <span>Seguridad</span>
              </button>
              <a className="pn-nav-item" href="/" target="_blank" rel="noopener">
                <Icono nombre="externo" size={19} />
                <span>Ver la web</span>
              </a>
              <button type="button" className="pn-nav-item" onClick={() => void salir()}>
                <Icono nombre="salir" size={19} />
                <span>Cerrar sesión</span>
              </button>
            </div>
          </nav>

          <div className={`pn-lateral-tienda ${tienda.abierto ? 'is-abierta' : 'is-cerrada'}`}>
            <p>
              <i aria-hidden="true" /> {tienda.abierto ? 'Tienda abierta' : 'Tienda cerrada'}
            </p>
            <small>
              {tienda.abierto
                ? tienda.cierraA && `Cierra hoy a las ${tienda.cierraA}`
                : tienda.proxima && `Abre ${tienda.proxima.etiqueta} a las ${tienda.proxima.hora}`}
            </small>
          </div>
        </aside>
        {lateralAbierto && <div className="pn-velo" onClick={() => setLateralAbierto(false)} aria-hidden="true" />}

        {/* ---------- contenido ---------- */}
        <div className="pn-principal">
          <header className="pn-cabecera">
            <button
              type="button"
              className="pn-icono-btn pn-solo-movil"
              aria-label="Abrir menú"
              onClick={() => setLateralAbierto(true)}
            >
              <Icono nombre="hamburguesaMenu" size={22} />
            </button>
            <div className="pn-cabecera-titulo">
              <h1>{titulo}</h1>
              <p>{seccion === 'inicio' ? `${sub} · ${fechaLarga()}` : sub}</p>
            </div>
            <span className="spacer" />
            <button
              type="button"
              className="pn-icono-btn"
              aria-label="Actualizar datos"
              title="Actualizar"
              onClick={() => setRecargar((n) => n + 1)}
            >
              <Icono nombre="recargar" size={20} />
            </button>
            <button
              type="button"
              className="pn-icono-btn pn-campana"
              aria-label={nuevos ? `${nuevos} pedidos nuevos` : 'Sin pedidos nuevos'}
              title="Pedidos nuevos"
              onClick={() => ir('pedidos')}
            >
              <Icono nombre="campana" size={20} />
              {!!nuevos && <span className="pn-insignia pn-insignia--flotante">{nuevos}</span>}
            </button>
            <div className="pn-usuario" title={correo ?? ''}>
              <span className="pn-avatar" aria-hidden="true">
                {(correo ?? 'A').charAt(0).toUpperCase()}
              </span>
              <span className="pn-usuario-texto">
                <b>Admin</b>
                <small>{correo}</small>
              </span>
            </div>
          </header>

          <main className="pn-contenido">
            {seccion === 'inicio' && (
              <Resumen
                recargarToken={recargarToken}
                ir={ir}
                nuevoProducto={() => {
                  ir('menu');
                  setCreandoProducto(true);
                }}
              />
            )}
            {seccion === 'pedidos' && (
              <Pedidos recargarToken={recargarToken} alCambiar={() => setContadorToken((n) => n + 1)} />
            )}
            {seccion === 'menu' && <Menu recargarToken={recargarToken} iniciarCreando={creandoProducto} />}
            {seccion === 'ventas' && <Analitica recargarToken={recargarToken} incluirVisitas={false} />}
            {seccion === 'visitas' && (
              <div className="panel-box">
                <h3>Visitas a la página</h3>
                <Visitas recargarToken={recargarToken} />
              </div>
            )}
          </main>
        </div>

        {seguridadAbierta && <ModalSeguridad alCerrar={() => setSeguridadAbierta(false)} />}
      </div>
    </>
  );
}
