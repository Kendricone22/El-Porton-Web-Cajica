/* =============================================================
 * LECTOR MÍNIMO DE .XLSX (sin librerías)
 *
 * Un .xlsx es un ZIP con XML dentro. Aquí se lee la PRIMERA hoja y se
 * devuelve como tabla de textos. Solo lo necesario para la plantilla de
 * productos de VectorPOS: celdas de texto, números y texto en línea.
 * No entiende fórmulas (se lee su último valor guardado), estilos ni
 * fechas — no hacen falta.
 *
 * La descompresión usa `DecompressionStream('deflate-raw')`, que traen
 * los navegadores actuales y Node 18+, así que también se prueba en tests.
 * La librería habitual para esto pesa ~400 KB; esto son unas 150 líneas.
 * ============================================================= */

type Entrada = { nombre: string; metodo: number; tamComprimido: number; offsetLocal: number };

function leerEntradas(buf: Uint8Array): Map<string, Entrada> {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  // Fin del directorio central: firma 0x06054b50, buscando desde el final
  // (puede haber un comentario de hasta 64 KB después).
  let fin = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 22 - 65535); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) {
      fin = i;
      break;
    }
  }
  if (fin < 0) throw new Error('El archivo no es un Excel válido (.xlsx).');

  const total = dv.getUint16(fin + 10, true);
  let p = dv.getUint32(fin + 16, true);
  const entradas = new Map<string, Entrada>();
  const texto = new TextDecoder();

  for (let n = 0; n < total; n++) {
    if (dv.getUint32(p, true) !== 0x02014b50) throw new Error('El Excel está dañado (directorio ZIP).');
    const metodo = dv.getUint16(p + 10, true);
    const tamComprimido = dv.getUint32(p + 20, true);
    const largoNombre = dv.getUint16(p + 28, true);
    const largoExtra = dv.getUint16(p + 30, true);
    const largoComent = dv.getUint16(p + 32, true);
    const offsetLocal = dv.getUint32(p + 42, true);
    const nombre = texto.decode(buf.subarray(p + 46, p + 46 + largoNombre));
    entradas.set(nombre, { nombre, metodo, tamComprimido, offsetLocal });
    p += 46 + largoNombre + largoExtra + largoComent;
  }
  return entradas;
}

async function extraer(buf: Uint8Array, e: Entrada): Promise<string> {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const o = e.offsetLocal;
  if (dv.getUint32(o, true) !== 0x04034b50) throw new Error('El Excel está dañado (cabecera ZIP).');
  const inicio = o + 30 + dv.getUint16(o + 26, true) + dv.getUint16(o + 28, true);
  const datos = buf.slice(inicio, inicio + e.tamComprimido);

  if (e.metodo === 0) return new TextDecoder().decode(datos);
  if (e.metodo !== 8) throw new Error('El Excel usa una compresión que no se puede leer.');
  const flujo = new Blob([datos]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Response(flujo).text();
}

const ENTIDADES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
export function decodificar(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const n = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    return ENTIDADES[e.toLowerCase()] ?? m;
  });
}

/** Une los fragmentos <t> de un bloque (el texto con formato viene partido). */
const textoDe = (bloque: string) =>
  [...bloque.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => decodificar(m[1])).join('');

/** "C" → 2, "AA" → 26 */
export function indiceColumna(ref: string): number {
  const letras = ref.replace(/[^A-Z]/gi, '').toUpperCase();
  let n = 0;
  for (const c of letras) n = n * 26 + (c.charCodeAt(0) - 64);
  return n - 1;
}

/** Convierte el XML de una hoja en tabla de textos. */
export function tablaDeHoja(xmlHoja: string, compartidos: string[]): string[][] {
  const filas: string[][] = [];
  for (const mf of xmlHoja.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const fila: string[] = [];
    for (const mc of mf[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = mc[1];
      const cuerpo = mc[2] ?? '';
      const ref = /\br="([A-Z]+)\d+"/.exec(attrs)?.[1];
      const tipo = /\bt="([^"]+)"/.exec(attrs)?.[1];
      const v = /<v>([\s\S]*?)<\/v>/.exec(cuerpo)?.[1];
      let valor = '';
      if (tipo === 's') valor = v !== undefined ? (compartidos[Number(v)] ?? '') : '';
      else if (tipo === 'inlineStr') valor = textoDe(cuerpo);
      else valor = v !== undefined ? decodificar(v) : '';
      const col = ref ? indiceColumna(ref) : fila.length;
      while (fila.length < col) fila.push('');
      fila[col] = valor;
    }
    filas.push(fila);
  }
  return filas;
}

/** Lee la primera hoja de un .xlsx. */
export async function leerXlsx(datos: ArrayBuffer | Uint8Array): Promise<string[][]> {
  const buf = datos instanceof Uint8Array ? datos : new Uint8Array(datos);
  const entradas = leerEntradas(buf);
  const leer = async (nombre: string) => {
    const e = entradas.get(nombre);
    return e ? extraer(buf, e) : null;
  };

  // Primera hoja según el libro (no siempre se llama sheet1.xml).
  let rutaHoja = 'xl/worksheets/sheet1.xml';
  const libro = await leer('xl/workbook.xml');
  const rels = await leer('xl/_rels/workbook.xml.rels');
  const rid = libro && /<sheet\b[^>]*\br:id="([^"]+)"/.exec(libro)?.[1];
  if (rid && rels) {
    const destino = new RegExp(`<Relationship\\b[^>]*\\bId="${rid}"[^>]*\\bTarget="([^"]+)"`).exec(rels)?.[1]
      ?? new RegExp(`<Relationship\\b[^>]*\\bTarget="([^"]+)"[^>]*\\bId="${rid}"`).exec(rels)?.[1];
    if (destino) rutaHoja = destino.startsWith('/') ? destino.slice(1) : `xl/${destino.replace(/^\.\//, '')}`;
  }

  const xmlHoja = await leer(rutaHoja);
  if (!xmlHoja) throw new Error('No se encontró ninguna hoja dentro del Excel.');
  const xmlComp = await leer('xl/sharedStrings.xml');
  const compartidos = xmlComp ? [...xmlComp.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map((m) => textoDe(m[1])) : [];
  return tablaDeHoja(xmlHoja, compartidos);
}
