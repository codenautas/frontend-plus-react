import { describe, expect, it } from 'vitest';
import { DetailTable } from 'backend-plus';
import { calcularFixedFieldsDetalle, claveDetalle, DETALLE, esFilaDetalle, FilaDetalle } from './detalles';

const detalle = (fields: DetailTable['fields']): DetailTable => ({ table: 'telefonos', abr: 'T', fields });

describe('calcularFixedFieldsDetalle', () => {
    const fila = { operativo: 'op1', id_casillero: 'F:I1', persona: 7, nulo: null };

    it('un campo con el mismo nombre en las dos tablas', () => {
        expect(calcularFixedFieldsDetalle(detalle(['persona']), fila)).toEqual([{ fieldName: 'persona', value: 7 }]);
    });

    it('source y target distintos (como los casilleros: id_casillero del padre es padre del hijo)', () => {
        const campos = calcularFixedFieldsDetalle(
            detalle([{ source: 'operativo', target: 'operativo' }, { source: 'id_casillero', target: 'padre' }]),
            fila
        );
        expect(campos).toEqual([
            { fieldName: 'operativo', value: 'op1' },
            { fieldName: 'padre', value: 'F:I1' },
        ]);
    });

    it('un valor fijo no sale de la fila', () => {
        expect(calcularFixedFieldsDetalle(detalle([{ target: 'tipo', value: 'celular' }]), fila)).toEqual([{ fieldName: 'tipo', value: 'celular' }]);
    });

    it('nullMeansAll: si el valor de la fila es nulo el campo no filtra', () => {
        const campos = calcularFixedFieldsDetalle(
            detalle([{ source: 'nulo', target: 'x', nullMeansAll: true }, { source: 'persona', target: 'persona', nullMeansAll: true }]),
            fila
        );
        expect(campos).toEqual([{ fieldName: 'persona', value: 7 }]);
    });

    it('until se conserva (rangos)', () => {
        const conUntil: DetailTable['fields'] = [{ source: 'persona', target: 'persona', until: 'hasta' } as DetailTable['fields'][number]];
        expect(calcularFixedFieldsDetalle(detalle(conUntil), fila)[0].until).toBe('hasta');
    });
});

describe('filas de detalle', () => {
    it('esFilaDetalle distingue la fila de detalle de una fila de datos', () => {
        const filaDetalle: FilaDetalle = { [DETALLE]: true, clave: '1|T', filaPadre: {}, detailTable: detalle(['persona']), fixedFields: [] };
        expect(esFilaDetalle(filaDetalle)).toBe(true);
        expect(esFilaDetalle({ id: 1 })).toBe(false);
        expect(esFilaDetalle(null)).toBe(false);
    });

    it('la clave combina la fila y la abreviatura del detalle', () => {
        expect(claveDetalle('F:I1', detalle(['persona']))).toBe('F:I1|T');
    });
});
