import { CATEGORIES } from '@/data/menu';
import { obtenerMenu } from '@/lib/menu-servidor';
import Navbar from '@/componentes/Navbar';
import Hero from '@/componentes/Hero';
import Tienda from '@/componentes/Tienda';
import RevelarAlScroll from '@/componentes/RevelarAlScroll';
import Lightbox from '@/componentes/Lightbox';
import InsigniaHorario from '@/componentes/InsigniaHorario';
import DatosEstructurados from '@/componentes/DatosEstructurados';
import FondoParticulas from '@/componentes/FondoParticulas';
import { ComoPedir, Contacto, LlamadoPedido, Nosotros, PieDePagina, Testimonios } from '@/componentes/Secciones';

/* =============================================================
 * PORTADA
 *
 * Componente de SERVIDOR: hace `await` sobre el menú directamente,
 * sin useEffect ni estados de carga. Cuando el HTML sale hacia el
 * navegador, los productos ya van dentro.
 *
 * Orden del rediseño (2026-10, sobre el prototipo aprobado por el
 * cliente):
 *   Hero → favoritos de la casa → banner de combo → "Elige tu antojo"
 *   (carta completa) → cómo pedir → testimonios → nosotros → contacto →
 *   ¿listo para pedir? → pie.
 *
 * `.page-dark` envuelve nosotros/contacto/llamado: es un fondo negro
 * opaco que tapa el lienzo de partículas de ahí hacia abajo.
 * ============================================================= */

export default async function Portada() {
  const { menu } = await obtenerMenu();

  return (
    <>
      <DatosEstructurados menu={menu} />

      {/* Va primero: es el fondo de TODA la página (fijo, z-index −1).
          `.hero` y `.page-dark` lo tapan con negro opaco donde no debe
          verse — el mismo truco que usa v1. */}
      <FondoParticulas />

      <Navbar />
      <InsigniaHorario />

      <main>
        <Hero />

        {/* Favoritos, combo y la carta completa comparten estado con el modal. */}
        <Tienda menu={menu} categorias={CATEGORIES} />

        <ComoPedir />

        <Testimonios />

        <div className="page-dark">
          <Nosotros />
          <Contacto />
          <LlamadoPedido />
        </div>
      </main>

      <PieDePagina />

      <Lightbox menu={menu} />
      <RevelarAlScroll />
    </>
  );
}
