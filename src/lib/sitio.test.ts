import { describe, expect, it } from 'vitest';
import { resolverSitio, SITIO_POR_DEFECTO } from './sitio';

describe('resolverSitio', () => {
  it('sin valor usa el de por defecto', () => {
    expect(resolverSitio(undefined)).toBe(SITIO_POR_DEFECTO);
    expect(resolverSitio('')).toBe(SITIO_POR_DEFECTO);
    expect(resolverSitio('   ')).toBe(SITIO_POR_DEFECTO);
  });

  it('quita espacios, saltos de línea y barras finales', () => {
    expect(resolverSitio('\nhttps://elportoncajica.com/ \n')).toBe('https://elportoncajica.com');
    expect(resolverSitio('https://elportoncajica.com///')).toBe('https://elportoncajica.com');
  });

  it('se queda solo con el origen (sin ruta ni parámetros)', () => {
    expect(resolverSitio('https://elportoncajica.com/pedir?x=1')).toBe('https://elportoncajica.com');
  });

  it('rechaza lo que no es una dirección http(s) y cae al valor por defecto', () => {
    expect(resolverSitio('javascript:alert(1)')).toBe(SITIO_POR_DEFECTO);
    expect(resolverSitio('elportoncajica.com')).toBe(SITIO_POR_DEFECTO);
    expect(resolverSitio('ftp://elportoncajica.com')).toBe(SITIO_POR_DEFECTO);
  });
});
