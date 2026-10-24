/* =============================================================
 * ACTUALIZAR PRECIOS DESDE LA PLANTILLA DE VectorPOS — lógica pura
 *
 * Flujo: Excel → filas {código, nombre, precio} → comparar con la carta
 * actual → lista de cambios para revisar → (el panel) aplicar.
 * Aquí NO se escribe nada: solo se calcula, para poder probarlo y para
 * que el dueño vea todo antes de confirmar.
 * ============================================================= */

import type { MapeoPos } from '@/data/mapeo-pos';

export type FilaPos = { codigo: string; nombre: string; precio: number | null; fila: number };

type Opcion = { label: string; price: number };
export type ProductoCarta = { id: string; data: { name?: string; options?: Opcion[] } };

export type CambioOpcion = { label: string; antes: number; despues: number; arrastrada: boolean };
export type CambioProducto = {
  id: string;
  nombre: string;
  opciones: CambioOpcion[];
  /** Nuevo arreglo completo de opciones, listo para guardar. */
  nuevas: Opcion[];
  /** Subida o bajada de más del 50%: se resalta para revisarla. */
  alerta: boolean;
};
export type Ignorado = { codigo: string; nombre: string; motivo: string };
export type Aviso = { concepto: string; actual: number; nuevo: number };

export type Resultado = {
  cambios: CambioProducto[];
  sinCambio: number;
  ignorados: Ignorado[];
  avisos: Aviso[];
  errores: Ignorado[];
};

const normalizar = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');

/**
 * "15000", "15.000", "$ 15.000", 15000.0 → 15000. Pesos colombianos: sin
 * decimales. Devuelve null si no es un precio válido (vacío, texto, ≤ 0).
 */
export function aPrecio(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  let s = String(v).trim().replace(/[$\s]/g, '');
  if (!s) return null;
  if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, ''); // 15.000
  else if (/^\d{1,3}(,\d{3})+$/.test(s)) s = s.replace(/,/g, ''); // 15,000
  else s = s.replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

/** Lee la tabla del Excel. Busca las columnas por su título, no por su posición. */
export function interpretarTabla(tabla: string[][]): { filas: FilaPos[]; error: string | null } {
  const iCab = tabla.findIndex((f) => f.some((c) => normalizar(c) === 'codigo'));
  if (iCab < 0) return { filas: [], error: 'No encontré la columna "Codigo". ¿Es la plantilla de productos de VectorPOS?' };
  const cab = tabla[iCab].map(normalizar);
  const col = (...nombres: string[]) => cab.findIndex((c) => nombres.includes(c));
  const cCod = col('codigo');
  const cNom = col('nombre', 'producto', 'descripcioncorta');
  const cPre = col('precio', 'valor', 'preciodeventa');
  if (cPre < 0) return { filas: [], error: 'No encontré la columna "Precio" en el Excel.' };

  const filas: FilaPos[] = [];
  tabla.slice(iCab + 1).forEach((f, i) => {
    const codigo = (f[cCod] ?? '').trim().replace(/\.0+$/, '');
    if (!codigo) return;
    filas.push({ codigo, nombre: (f[cNom] ?? '').trim(), precio: aPrecio(f[cPre]), fila: iCab + 2 + i });
  });
  return { filas, error: filas.length ? null : 'El Excel no tiene productos debajo de los títulos.' };
}

/**
 * Compara el Excel con la carta actual y arma la lista de cambios.
 * `carta` = filas de menu_items (lo que el panel ya tiene en la base).
 * `enCodigo` = precios que viven en el código (combo y adiciones).
 */
export function calcularCambios(
  filas: FilaPos[],
  carta: ProductoCarta[],
  mapeo: Record<string, MapeoPos>,
  enCodigo: { combo: number; adiciones: Record<string, number> },
): Resultado {
  const porId = new Map(carta.map((p) => [p.id, p]));
  const ignorados: Ignorado[] = [];
  const errores: Ignorado[] = [];
  const avisos = new Map<string, Aviso>();
  // id → (opción → {precio, filas que la piden, arrastrar})
  const pedidos = new Map<string, Map<string, { precio: number; codigos: string[]; arrastrar: boolean }>>();

  for (const f of filas) {
    const m = mapeo[f.codigo];
    if (!m) {
      ignorados.push({ codigo: f.codigo, nombre: f.nombre, motivo: 'No está en la carta web' });
      continue;
    }
    if (f.precio === null) {
      errores.push({ codigo: f.codigo, nombre: f.nombre, motivo: `Precio vacío o inválido (fila ${f.fila})` });
      continue;
    }
    if (m.tipo === 'combo') {
      if (f.precio !== enCodigo.combo) avisos.set('combo', { concepto: 'Precio del combo', actual: enCodigo.combo, nuevo: f.precio });
      continue;
    }
    if (m.tipo === 'adicion') {
      const actual = enCodigo.adiciones[m.nombre];
      if (actual !== undefined && f.precio !== actual)
        avisos.set('ad:' + m.nombre, { concepto: `Adición: ${m.nombre}`, actual, nuevo: f.precio });
      continue;
    }

    const prod = porId.get(m.id);
    if (!prod) {
      errores.push({ codigo: f.codigo, nombre: f.nombre, motivo: 'El plato no está en el menú del panel' });
      continue;
    }
    if (!(prod.data.options ?? []).some((o) => o.label === m.opcion)) {
      errores.push({ codigo: f.codigo, nombre: f.nombre, motivo: `El plato no tiene la opción "${m.opcion}"` });
      continue;
    }
    const porOpcion = pedidos.get(m.id) ?? new Map();
    const previo = porOpcion.get(m.opcion);
    if (previo && previo.precio !== f.precio) {
      // Dos códigos del POS para la misma opción con precios distintos
      // (p. ej. Águila normal y light): no se adivina cuál vale.
      errores.push({
        codigo: f.codigo,
        nombre: f.nombre,
        motivo: `Choca con el código ${previo.codigos[0]} ($${previo.precio.toLocaleString('es-CO')}): la web tiene un solo precio`,
      });
      porOpcion.set(m.opcion, { ...previo, precio: NaN });
    } else {
      porOpcion.set(m.opcion, {
        precio: f.precio,
        codigos: [...(previo?.codigos ?? []), f.codigo],
        arrastrar: !!m.arrastrar || !!previo?.arrastrar,
      });
    }
    pedidos.set(m.id, porOpcion);
  }

  const cambios: CambioProducto[] = [];
  let sinCambio = 0;

  for (const [id, porOpcion] of pedidos) {
    if ([...porOpcion.values()].some((v) => Number.isNaN(v.precio))) continue; // conflicto: ya reportado
    const prod = porId.get(id)!;
    const actuales = prod.data.options ?? [];
    const fijadas = new Set(porOpcion.keys());

    // Cuánto se mueve el precio de la(s) opción(es) que "arrastran".
    let delta = 0;
    for (const [label, v] of porOpcion) {
      if (!v.arrastrar) continue;
      const antes = actuales.find((o) => o.label === label)!.price;
      delta = v.precio - antes;
    }

    const nuevas = actuales.map((o) => {
      const pedido = porOpcion.get(o.label);
      if (pedido) return { ...o, price: pedido.precio };
      const hayArrastre = [...porOpcion.values()].some((v) => v.arrastrar);
      return hayArrastre ? { ...o, price: Math.max(0, o.price + delta) } : o;
    });

    const opciones: CambioOpcion[] = nuevas
      .map((o, i) => ({ label: o.label, antes: actuales[i].price, despues: o.price, arrastrada: !fijadas.has(o.label) }))
      .filter((c) => c.antes !== c.despues);

    if (!opciones.length) {
      sinCambio++;
      continue;
    }
    const alerta = opciones.some((c) => c.antes > 0 && Math.abs(c.despues - c.antes) / c.antes > 0.5);
    cambios.push({ id, nombre: prod.data.name ?? id, opciones, nuevas, alerta });
  }

  cambios.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  return { cambios, sinCambio, ignorados, avisos: [...avisos.values()], errores };
}
