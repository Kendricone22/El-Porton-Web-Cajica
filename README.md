# El Portón Cajicá — web de pedidos y panel de administración

Carta digital, carrito y pedidos por WhatsApp de **El Portón Cajicá** (comidas
rápidas y pizzería artesanal), con un panel privado para ver pedidos, editar el
menú y consultar ventas y visitas.

**Stack:** Next.js 16 (App Router) · React · TypeScript · Tailwind CSS 4 ·
Supabase (Postgres + Auth + Storage) · Vercel.

## Cómo funciona

- **Web pública (`/`)**: carta con 7 categorías (59 productos), personalización
  de cada plato, carrito y envío del pedido a WhatsApp.
- **Pedidos (`/api/pedidos`)**: el servidor **recalcula el precio** de cada
  pedido con el menú real; nunca se confía en el precio que manda el navegador.
  Si la base de datos falla, el cliente igualmente puede enviar su pedido.
- **Panel (`/admin`)**: acceso con correo y contraseña (Supabase Auth, 2FA
  opcional). Pedidos, editor de menú con fotos, ventas, visitas y exportación a
  CSV. Solo entran los correos registrados en la tabla `admins`.
- **Menú**: `src/data/menu.ts` define qué platos existen; lo que el dueño edita
  en el panel (precio, descripción, agotado, foto) vive en Supabase y se
  fusiona por encima.
- **Seguridad**: las políticas RLS de Supabase protegen los datos; la clave de
  servidor nunca llega al navegador. Cabeceras de seguridad en
  `src/lib/cabeceras.ts`.
- **Anti-spam de pedidos** (`src/lib/antispam.ts`): campo trampa invisible,
  límite por conexión, por teléfono y tope global. Los umbrales son holgados
  a propósito y, si la base de datos no responde, el pedido pasa igual.

## Puesta en marcha local

Requisitos: Node.js 20 o superior.

```bash
npm install
cp .env.example .env.local   # y rellena las 3 variables
npm run dev                  # http://localhost:3000
```

| Variable | Qué es |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto de Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publishable key (pública) |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret key. **Solo servidor, nunca con `NEXT_PUBLIC_`** |
| `NEXT_PUBLIC_SITE_URL` | *(opcional)* dirección pública del sitio; ver «Cambio de dominio» |

## Scripts

| Comando | Para qué |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` / `npm start` | Compilar y servir en producción |
| `npm test` | Tests unitarios (Vitest) |
| `npm run typecheck` | Revisión de tipos |
| `npm run lint` | ESLint |

## Base de datos

Todo el esquema está en [`db/`](db/README.md). Para montar un proyecto de
Supabase desde cero basta correr `db/reconstruir-todo.sql` (ver el README de esa
carpeta), crear el usuario administrador en Authentication → Users y cerrar el
registro público.

## Cambio de dominio

La dirección pública vive en un solo lugar (`src/lib/sitio.ts`). Al mover el
dominio: definir `NEXT_PUBLIC_SITE_URL=https://dominio-nuevo.com` en Vercel y
redesplegar. Con eso se actualizan `canonical`, `og:url`, los datos
estructurados, `robots.txt` y `sitemap.xml`.

## Integración continua

`.github/workflows/ci.yml` corre tipos, tests y build en cada push y pull
request. El lint es informativo (hay 10 errores conocidos de
`react-hooks/set-state-in-effect`, pendientes de refactorizar).

## Despliegue (Vercel)

1. Importar este repositorio en Vercel (Framework: Next.js; no hace falta
   Root Directory).
2. Definir las 3 variables de entorno.
3. Funciones en la región más cercana a la base de datos de Supabase.
4. Comprobar `/api/salud` y hacer un pedido de prueba antes de apuntar el
   dominio.
