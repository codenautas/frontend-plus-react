// src/hooks/grid/useGridMenu.ts
import React, { useMemo, useCallback, useState } from 'react';
import RefreshIcon from '@mui/icons-material/Refresh';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { DataGridOption, TableDefinition, FixedField, CallApiOptions } from '../../types';

interface UseGridMenuProps {
    tableDefinition: TableDefinition | null;
    tableName: string;
    fixedFields?: FixedField[];
    setTableData: React.Dispatch<React.SetStateAction<any[]>>;
    callApi: (procedureName: string, params: Record<string, any>, opts?: CallApiOptions) => Promise<any | undefined>;
    resetSorting?: () => void;
    triggerImport?: () => void;
    triggerExport?: () => void;
}

export const useGridMenu = ({
    tableDefinition,
    tableName,
    fixedFields,
    setTableData,
    callApi,
    resetSorting,
    triggerImport,
    triggerExport,
}: UseGridMenuProps) => {

    const { showSuccess, showError, showWarning } = useSnackbar();

    const menuOptions = useMemo((): DataGridOption[] => {
        if (!tableDefinition) return [];

        const options: DataGridOption[] = [];

        // Refrescar (siempre visible)
        options.push({
            id: 'refresh',
            label: 'refrescar la grilla desde la base de datos',
            icon: React.createElement(RefreshIcon),
            handler: async () => {
                try {
                    const data = await callApi('table_data', { table: tableName, fixedFields });
                    setTableData(data);
                    if (resetSorting) resetSorting();
                    showSuccess('Grilla refrescada correctamente');
                } catch (err: any) {
                    showError(`Error al refrescar: ${err.message || 'Error desconocido'}`);
                }
            },
            visible: true
        });

        // Mostrar columnas relacionadas
        options.push({
            id: 'showColumns',
            label: 'mostrar las columnas relacionadas',
            icon: React.createElement(ViewColumnIcon),
            handler: async () => { console.log('Mostrar columnas relacionadas'); },
            visible: true
        });

        // Ocultar/mostrar columnas
        options.push({
            id: 'hideColumns',
            label: 'ocultar o mostrar columnas',
            icon: React.createElement(VisibilityOffIcon),
            handler: async () => { console.log('Ocultar/mostrar columnas'); },
            visible: true
        });

        if (tableDefinition.allow?.export) {
            options.push({
                id: 'export',
                label: 'exportar',
                icon: React.createElement(FileDownloadIcon),
                handler: async () => {
                    if (triggerExport) triggerExport();
                    else showWarning('La funcionalidad de exportación no está disponible en este momento.');
                },
                visible: true
            });
        }

        if (tableDefinition.allow?.import) {
            options.push({
                id: 'import',
                label: 'importar (Excel/Tab)',
                icon: React.createElement(FileUploadIcon),
                handler: async () => {
                    if (triggerImport) triggerImport();
                    else showWarning('La funcionalidad de importación no está disponible en este momento.');
                },
                visible: true
            });
        }

        if (tableDefinition.allow?.delete) {
            options.push({
                id: 'deleteAll',
                label: 'borrar todos los registros',
                icon: React.createElement(DeleteSweepIcon),
                handler: async () => {
                    showWarning('Esta operación eliminará TODOS los registros de la tabla');
                },
                visible: true
            });
        }

        options.push({
            id: 'completeTable',
            label: 'tabla completa y filtrada',
            icon: React.createElement(FilterAltIcon),
            handler: async () => { console.log('Toggle tabla completa/filtrada'); },
            visible: true
        });

        return options;
    }, [tableDefinition, tableName, fixedFields, setTableData, callApi, resetSorting, triggerImport, triggerExport, showSuccess, showError, showWarning]);

    return { menuOptions };
};
