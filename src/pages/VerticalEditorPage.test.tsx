import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { TableDefinition } from 'backend-plus';
import { VerticalEditorPage } from './VerticalEditorPage';
import { FieldDefinition } from '../types';

vi.mock('../hooks/useTableRecordSave', () => ({ useTableRecordSave: () => ({ saveRecord: vi.fn() }) }));
vi.mock('../components/forms/TypedField', () => ({
    TypedField: ({ fieldDef }: { fieldDef: FieldDefinition }) => <span data-testid="campo">{fieldDef.name}</span>,
}));

const definicion: TableDefinition = {
    name: 'personas',
    primaryKey: ['id'],
    fields: [
        { name: 'id', typeName: 'integer' },
        { name: 'nombre', typeName: 'text' },
        { name: 'saldo', typeName: 'decimal' },
        { name: 'interno', typeName: 'text', visible: false },
    ],
};

function camposDeLaFicha(columnasOcultas?: string[]): string[] {
    const { getAllByTestId } = render(
        <VerticalEditorPage tableName="personas" tableDefinition={definicion} initialData={{ id: 1 }} columnasOcultas={columnasOcultas && new Set(columnasOcultas)}
            onSaveSuccess={() => undefined} onClose={() => undefined} />
    );
    return getAllByTestId('campo').map(campo => campo.textContent ?? '');
}

describe('VerticalEditorPage', () => {
    it('un campo con visible:false no se dibuja nunca', () => {
        expect(camposDeLaFicha()).toEqual(['id', 'nombre', 'saldo']);
    });

    it('las columnas que la grilla tiene ocultas tampoco se ven en la ficha', () => {
        expect(camposDeLaFicha(['saldo'])).toEqual(['id', 'nombre']);
    });
});
