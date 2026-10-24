/* =============================================================
 * GENERADOR MÍNIMO DE .XLSX (sin librerías)
 *
 * Arma un Excel de una hoja: un ZIP (sin compresión, "stored") con los
 * XML mínimos que Excel, LibreOffice y Google Sheets aceptan. Los textos
 * van como "inlineStr" (no hace falta la tabla de textos compartidos) y
 * los números como números, para que se puedan sumar en Excel.
 *
 * Hermano de xlsx-lite.ts (el lector): los tests generan un archivo con
 * esto y lo vuelven a leer con aquel.
 * ============================================================= */

export type Celda = string | number | null | undefined;

const TABLA_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(datos: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < datos.length; i++) c = TABLA_CRC[(c ^ datos[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** ZIP sin compresión. Suficiente para unos pocos KB de XML. */
function zip(archivos: { nombre: string; datos: Uint8Array }[]): Uint8Array<ArrayBuffer> {
  const enc = new TextEncoder();
  const locales: Uint8Array[] = [];
  const centrales: Uint8Array[] = [];
  let offset = 0;

  for (const a of archivos) {
    const nombre = enc.encode(a.nombre);
    const crc = crc32(a.datos);
    const tam = a.datos.length;

    const local = new Uint8Array(30 + nombre.length + tam);
    const dl = new DataView(local.buffer);
    dl.setUint32(0, 0x04034b50, true);
    dl.setUint16(4, 20, true); // versión necesaria
    dl.setUint16(6, 0x0800, true); // nombres en UTF-8
    dl.setUint16(8, 0, true); // sin compresión
    dl.setUint32(14, crc, true);
    dl.setUint32(18, tam, true);
    dl.setUint32(22, tam, true);
    dl.setUint16(26, nombre.length, true);
    local.set(nombre, 30);
    local.set(a.datos, 30 + nombre.length);
    locales.push(local);

    const central = new Uint8Array(46 + nombre.length);
    const dc = new DataView(central.buffer);
    dc.setUint32(0, 0x02014b50, true);
    dc.setUint16(4, 20, true);
    dc.setUint16(6, 20, true);
    dc.setUint16(8, 0x0800, true);
    dc.setUint16(10, 0, true);
    dc.setUint32(16, crc, true);
    dc.setUint32(20, tam, true);
    dc.setUint32(24, tam, true);
    dc.setUint16(28, nombre.length, true);
    dc.setUint32(42, offset, true);
    central.set(nombre, 46);
    centrales.push(central);

    offset += local.length;
  }

  const tamCentral = centrales.reduce((n, c) => n + c.length, 0);
  const fin = new Uint8Array(22);
  const df = new DataView(fin.buffer);
  df.setUint32(0, 0x06054b50, true);
  df.setUint16(8, archivos.length, true);
  df.setUint16(10, archivos.length, true);
  df.setUint32(12, tamCentral, true);
  df.setUint32(16, offset, true);

  const total = new Uint8Array(offset + tamCentral + 22);
  let p = 0;
  for (const parte of [...locales, ...centrales, fin]) {
    total.set(parte, p);
    p += parte.length;
  }
  return total;
}

/** Escapa texto para XML y quita caracteres de control que Excel rechaza. */
export function escaparXml(s: string): string {
  return s
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const letraColumna = (i: number): string => {
  let s = '';
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
};

/**
 * Crea el .xlsx. `anchos` = ancho de cada columna en caracteres (opcional).
 * La primera fila va en negrita (títulos).
 */
export function crearXlsx(filas: Celda[][], opciones: { hoja?: string; anchos?: number[] } = {}): Uint8Array<ArrayBuffer> {
  const hoja = escaparXml((opciones.hoja ?? 'Worksheet').slice(0, 31));
  const filasXml = filas
    .map((fila, r) => {
      const celdas = fila
        .map((v, c) => {
          if (v === null || v === undefined || v === '') return '';
          const ref = `${letraColumna(c)}${r + 1}`;
          const estilo = r === 0 ? ' s="1"' : '';
          if (typeof v === 'number' && Number.isFinite(v)) return `<c r="${ref}"${estilo}><v>${v}</v></c>`;
          return `<c r="${ref}" t="inlineStr"${estilo}><is><t xml:space="preserve">${escaparXml(String(v))}</t></is></c>`;
        })
        .join('');
      return `<row r="${r + 1}">${celdas}</row>`;
    })
    .join('');
  const cols = opciones.anchos?.length
    ? `<cols>${opciones.anchos.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>`
    : '';

  const enc = new TextEncoder();
  const x = (s: string) => enc.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' + s);
  const NS = 'http://schemas.openxmlformats.org';

  return zip([
    {
      nombre: '[Content_Types].xml',
      datos: x(
        `<Types xmlns="${NS}/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
      ),
    },
    {
      nombre: '_rels/.rels',
      datos: x(
        `<Relationships xmlns="${NS}/package/2006/relationships"><Relationship Id="rId1" Type="${NS}/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
      ),
    },
    {
      nombre: 'xl/workbook.xml',
      datos: x(
        `<workbook xmlns="${NS}/spreadsheetml/2006/main" xmlns:r="${NS}/officeDocument/2006/relationships"><sheets><sheet name="${hoja}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
      ),
    },
    {
      nombre: 'xl/_rels/workbook.xml.rels',
      datos: x(
        `<Relationships xmlns="${NS}/package/2006/relationships"><Relationship Id="rId1" Type="${NS}/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${NS}/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
      ),
    },
    {
      nombre: 'xl/styles.xml',
      datos: x(
        `<styleSheet xmlns="${NS}/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs></styleSheet>`,
      ),
    },
    {
      nombre: 'xl/worksheets/sheet1.xml',
      datos: x(`<worksheet xmlns="${NS}/spreadsheetml/2006/main">${cols}<sheetData>${filasXml}</sheetData></worksheet>`),
    },
  ]);
}
