import type { Metadata } from 'next';
import Link from 'next/link';

/* 404 con la marca. Next la devuelve con estado HTTP 404 (importante para
   los buscadores: una página "no encontrada" con 200 se indexaría). */
export const metadata: Metadata = {
  title: 'Página no encontrada · El Portón Cajicá',
  robots: { index: false, follow: false },
};

export default function NoEncontrada() {
  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        padding: '2rem 1rem',
        textAlign: 'center',
      }}
    >
      <p className="font-display" style={{ fontSize: 'clamp(4rem, 18vw, 9rem)', lineHeight: 1, color: 'var(--rojo)' }}>
        404
      </p>
      <h1 className="font-display" style={{ fontSize: 'clamp(1.6rem, 6vw, 2.6rem)' }}>
        Esta página no está en la carta
      </h1>
      <p style={{ maxWidth: '28rem', opacity: 0.75 }}>
        El enlace que buscas no existe o cambió de lugar. Vuelve al inicio y pide lo que se te antoje.
      </p>
      <Link href="/" className="cta-btn" style={{ marginTop: '0.5rem' }}>
        Volver a la carta
      </Link>
    </main>
  );
}
