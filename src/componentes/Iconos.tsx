/* =============================================================
 * ICONOS DE LÍNEA (rediseño)
 *
 * Trazo único, sin relleno, en `currentColor`: el color lo pone el CSS.
 * Dibujados a mano en una cuadrícula de 24×24 para que todos tengan el
 * mismo grosor y peso visual.
 * ============================================================= */

import type { CategoriaId } from '@/types/menu';

type Props = { className?: string; size?: number };

function Svg({ className, size = 24, children }: Props & { children: React.ReactNode }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const TRAZOS: Record<CategoriaId, React.ReactNode> = {
  hamburguesas: (
    <>
      <path d="M4 10.5C4 6.9 7.6 4.5 12 4.5s8 2.4 8 6H4z" />
      <path d="M3.5 13.5h17" />
      <path d="M4.5 16.5h15v.5a2.5 2.5 0 0 1-2.5 2.5H7A2.5 2.5 0 0 1 4.5 17v-.5z" />
      <path d="M9 7.5h.01M12 6.8h.01M15 7.5h.01" />
    </>
  ),
  perros: (
    <>
      <path d="M3.5 12.5c0-1.4 1.1-2.5 2.5-2.5h12c1.4 0 2.5 1.1 2.5 2.5S19.4 15 18 15H6c-1.4 0-2.5-1.1-2.5-2.5z" />
      <path d="M2.5 12.5h19" />
      <path d="M5 16.5c.8 1.3 2.2 2 3.8 2h6.4c1.6 0 3-.7 3.8-2" />
      <path d="M7 12.5c1-1 2-1 3 0s2 1 3 0 2-1 3 0" />
    </>
  ),
  mazorcadas: (
    <>
      <path d="M12 3.5c2.6 0 4 3.4 4 7.5s-1.4 7.5-4 7.5-4-3.4-4-7.5 1.4-7.5 4-7.5z" />
      <path d="M8.5 9h7M8.2 12h7.6M8.7 15h6.6M12 3.5v15" />
      <path d="M12 18.5c-1.5 1.5-3.5 2-5.5 2 .2-2.4 1.1-4.3 2.6-5.6M12 18.5c1.5 1.5 3.5 2 5.5 2-.2-2.4-1.1-4.3-2.6-5.6" />
    </>
  ),
  salchipapas: (
    <>
      <path d="M6 10.5h12l-1.5 9.5h-9L6 10.5z" />
      <path d="M8 10.5 7.2 4.5M10.5 10.5 10.2 3.5M13.5 10.5l.3-6.5M16 10.5l.8-5.5" />
      <path d="M9 14.5c1.9 1.2 4.1 1.2 6 0" />
    </>
  ),
  pizzas: (
    <>
      <path d="M12 21 3.5 6.5C8.7 3.2 15.3 3.2 20.5 6.5L12 21z" />
      <path d="M5 9c4.3-2.4 9.7-2.4 14 0" />
      <circle cx="10.5" cy="11.5" r="1.1" />
      <circle cx="14" cy="13.5" r="1" />
      <circle cx="12" cy="16.5" r=".9" />
    </>
  ),
  infantil: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.5 14c.9 1.3 2.1 2 3.5 2s2.6-.7 3.5-2" />
      <path d="M9 10h.01M15 10h.01" />
      <path d="M12 3.5c-1.2 1-1.4 2.2-.6 3.4" />
    </>
  ),
  bebidas: (
    <>
      <path d="M6.5 8.5h11l-1.3 12h-8.4l-1.3-12z" />
      <path d="M5.5 8.5h13" />
      <path d="M12.5 8.5 14 3.5l3 .5" />
      <path d="M7.2 13h9.6" />
    </>
  ),
};

export function IconoCategoria({ cat, ...p }: Props & { cat: CategoriaId }) {
  return <Svg {...p}>{TRAZOS[cat] ?? TRAZOS.hamburguesas}</Svg>;
}

const VARIOS = {
  llama: (
    <path d="M12 21c3.6 0 6-2.5 6-6 0-4.5-4-6.5-4.5-10.5C10.5 6.5 9 9.3 9.5 12c-1-.4-1.8-1.3-2-2.5C6.5 11 6 12.5 6 15c0 3.5 2.4 6 6 6z" />
  ),
  carne: (
    <>
      <path d="M15.5 4.5c2.6 1.2 4.3 3.9 3.9 7-.5 4.2-4.6 7.5-9.2 7.5-3.6 0-6.2-2.2-6.2-5.2 0-2.2 1.4-3.6 3.3-4.4 1.6-.7 2.3-1.7 2.8-3.3.7-2.2 3.2-2.7 5.4-1.6z" />
      <circle cx="13.5" cy="10.5" r="2" />
    </>
  ),
  moto: (
    <>
      <circle cx="6" cy="16.5" r="3" />
      <circle cx="18" cy="16.5" r="3" />
      <path d="M6 16.5h6l3.5-6H19M9.5 10.5h4M15.5 10.5l-1.5-4h-2.5" />
    </>
  ),
  estrella: <path d="m12 3.5 2.6 5.3 5.9.8-4.3 4.2 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.2 5.9-.8L12 3.5z" />,
  bolsa: (
    <>
      <path d="M5.5 8h13l-1 12.5h-11L5.5 8z" />
      <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
      <path d="M12 12.5c-1.4 1.1-2 2.2-2 3.2a2 2 0 0 0 4 0c0-1-.6-2.1-2-3.2z" />
    </>
  ),
  whatsapp: (
    <>
      <path d="M20.5 11.6a8.5 8.5 0 0 1-12.6 7.5L3.5 20.5l1.4-4.3a8.5 8.5 0 1 1 15.6-4.6z" />
      <path d="M9 8.5c.2 2.8 2.7 5.6 6.5 6.5l1-1.5-2-1-1 .8c-1-.5-2-1.5-2.6-2.6l.8-1-1-2L9 8.5z" />
    </>
  ),
  instagram: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <path d="M17.3 6.7h.01" />
    </>
  ),
  ubicacion: (
    <>
      <path d="M20 10c0 5.5-8 11-8 11s-8-5.5-8-11a8 8 0 0 1 16 0z" />
      <circle cx="12" cy="10" r="3" />
    </>
  ),
  reloj: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  flecha: <path d="M5 12h14M13 6l6 6-6 6" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
} as const;

export type NombreIcono = keyof typeof VARIOS;

export function Icono({ nombre, ...p }: Props & { nombre: NombreIcono }) {
  return <Svg {...p}>{VARIOS[nombre]}</Svg>;
}
