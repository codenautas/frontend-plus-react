import { beforeAll, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { useContext } from 'react';
import { DetailTable } from 'backend-plus';
import { AltoDisponibleContext, BotonDetalle, DETALLE, DetalleWScreen, DetallesGrillaContext, FilaDetalle } from './detalles';
import { extendConditions } from './condiciones';
import { extendWScreens } from '../../pages/WScreens';
import { WScreenProps } from '../../types';

// jsdom no trae ResizeObserver: se informa una medida apenas se observa un elemento
beforeAll(() => {
    vi.stubGlobal('ResizeObserver', class {
        constructor(private readonly alCambiar: () => void) {}
        observe() { this.alCambiar(); }
        unobserve() {}
        disconnect() {}
    });
});

const detalleWScreen: DetailTable = { wScreen: 'ticket', fields: ['proyecto', 'ticket'], abr: 'A', label: 'anotaciones' };

function filaDeDetalle(): FilaDetalle {
    return {
        [DETALLE]: true,
        clave: 'p1|7|A',
        filaPadre: { proyecto: 'p1', ticket: 7 },
        detailTable: detalleWScreen,
        fixedFields: [{ fieldName: 'proyecto', value: 'p1' }, { fieldName: 'ticket', value: 7 }],
    };
}

describe('DetalleWScreen', () => {
    it('muestra la wScreen registrada y le pasa los fixedFields como params (como mainAction de backend-plus)', () => {
        const Ticket = ({ screenName, params }: WScreenProps) => <span data-testid="pantalla">{screenName}:{JSON.stringify(params)}</span>;
        extendWScreens({ ticket: Ticket });
        const { getByTestId } = render(<DetalleWScreen fila={filaDeDetalle()} onAlto={vi.fn()} onAncho={vi.fn()} />);
        expect(getByTestId('pantalla').textContent).toBe('ticket:{"proyecto":"p1","ticket":7}');
    });

    it('si la wScreen no está registrada avisa en lugar de dejar el detalle vacío', () => {
        const fila = filaDeDetalle();
        fila.detailTable = { ...detalleWScreen, wScreen: 'noRegistrada' };
        const { container } = render(<DetalleWScreen fila={fila} onAlto={vi.fn()} onAncho={vi.fn()} />);
        expect(container.textContent).toContain('noRegistrada');
    });

    it('informa su alto (más el margen de la fila) y su ancho a la grilla que lo contiene', () => {
        extendWScreens({ ticket: () => <span>hola</span> });
        const onAlto = vi.fn();
        const onAncho = vi.fn();
        render(<DetalleWScreen fila={filaDeDetalle()} onAlto={onAlto} onAncho={onAncho} />);
        // jsdom no calcula medidas: lo que importa es que la medida del contenido llega, sumándole el margen vertical (8)
        expect(onAlto).toHaveBeenCalledWith(8);
        expect(onAncho).toHaveBeenCalledWith(0);
    });

    it('las grillas que arma la wScreen reciben por contexto el alto máximo disponible (menos el margen)', () => {
        function LeeElAlto() {
            return <span data-testid="alto">{String(useContext(AltoDisponibleContext))}</span>;
        }
        extendWScreens({ ticket: LeeElAlto });
        const { getByTestId } = render(<DetalleWScreen fila={filaDeDetalle()} altoMaximo={300} onAlto={vi.fn()} onAncho={vi.fn()} />);
        expect(getByTestId('alto').textContent).toBe('292');
    });
});

describe('BotonDetalle con condition', () => {
    const contexto = { abiertos: new Set<string>(), alternarDetalle: vi.fn(), renderDetalle: () => null };
    const tabla: DetailTable = { table: 'telefonos', fields: ['persona'], abr: 'T', condition: 'soloMayores' };

    function dibujar(fila: Record<string, unknown>) {
        return render(
            <DetallesGrillaContext.Provider value={contexto}>
                <BotonDetalle row={fila} rowId="1" detailTable={tabla} deshabilitado={false} />
            </DetallesGrillaContext.Provider>
        );
    }

    it('si la condición da falso la fila no tiene botón (queda la celda vacía)', () => {
        extendConditions({ soloMayores: fila => Number(fila.edad) >= 18 });
        expect(dibujar({ edad: 10 }).container.querySelector('button')).toBeNull();
    });

    it('si la condición da verdadero muestra el botón', () => {
        extendConditions({ soloMayores: fila => Number(fila.edad) >= 18 });
        expect(dibujar({ edad: 30 }).container.querySelector('button')).not.toBeNull();
    });
});
