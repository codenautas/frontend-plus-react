// src/components/grid/menu/options.tsx
import React from 'react';
import RefreshIcon from '@mui/icons-material/Refresh';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import { DataGridOption, TableDefinition, FixedField } from '../../../types';

/**
 * Parámetros para construir las opciones del menú
 */
export interface BuildMenuOptionsParams {
    tableDefinition: TableDefinition | null;
    tableName: string;
    fixedFields?: FixedField[];
    setTableData: React.Dispatch<React.SetStateAction<any[]>>;
    callApi: (service: string, params: any) => Promise<any>;
    showSuccess: (message: string) => void;
    showError: (message: string) => void;
    showWarning: (message: string) => void;
}

/**
 * Construye el array de opciones del menú de la grilla
 * Las opciones se muestran condicionalmente según los permisos de la tabla
 */
export const buildMenuOptions = (params: BuildMenuOptionsParams): DataGridOption[] => {
    const { 
        tableDefinition, 
        tableName, 
        fixedFields, 
        setTableData, 
        callApi, 
        showSuccess, 
        showError,
        showWarning
    } = params;

    if (!tableDefinition) return [];

    const options: DataGridOption[] = [];

    // Opción: Refrescar (siempre visible)
    options.push({
        id: 'refresh',
        label: 'refrescar la grilla desde la base de datos',
        icon: <RefreshIcon />,
        handler: async () => {
            try {
                const data = await callApi('table_data', {
                    table: tableName,
                    fixedFields: fixedFields
                });
                setTableData(data);
                showSuccess('Grilla refrescada correctamente');
            } catch (err: any) {
                showError(`Error al refrescar: ${err.message || 'Error desconocido'}`);
            }
        },
        visible: true
    });

    // Opción: Mostrar columnas relacionadas (siempre visible)
    options.push({
        id: 'showColumns',
        label: 'mostrar las columnas relacionadas',
        icon: <ViewColumnIcon />,
        handler: async () => {
            console.log('Mostrar columnas relacionadas');
            // TODO: Implementar lógica
        },
        visible: true
    });

    // Opción: Ocultar/mostrar columnas (siempre visible)
    options.push({
        id: 'hideColumns',
        label: 'ocultar o mostrar columnas',
        icon: <VisibilityOffIcon />,
        handler: async () => {
            console.log('Ocultar/mostrar columnas');
            // TODO: Implementar lógica
        },
        visible: true
    });

    // Opción: Exportar (solo si está permitido)
    if (tableDefinition.allow?.export) {
        options.push({
            id: 'export',
            label: 'exportar',
            icon: <FileDownloadIcon />,
            handler: async () => {
                console.log('Exportar datos');
                // TODO: Implementar lógica de exportación
            },
            visible: true
        });
    }

    // Opción: Importar (solo si está permitido)
    if (tableDefinition.allow?.import) {
        options.push({
            id: 'import',
            label: 'importar',
            icon: <FileUploadIcon />,
            handler: async () => {
                console.log('Importar datos');
                // TODO: Implementar lógica de importación
            },
            visible: true
        });
    }

    // Opción: Borrar todos los registros (solo si está permitido delete)
    if (tableDefinition.allow?.delete) {
        options.push({
            id: 'deleteAll',
            label: 'borrar todos los registros',
            icon: <DeleteSweepIcon />,
            handler: async () => {
                showWarning('Esta operación eliminará TODOS los registros de la tabla');
                // TODO: Implementar confirmación y lógica
            },
            visible: true
        });
    }

    // Opción: Tabla completa y filtrada
    options.push({
        id: 'completeTable',
        label: 'tabla completa y filtrada',
        icon: <FilterAltIcon />,
        handler: async () => {
            console.log('Toggle tabla completa/filtrada');
            // TODO: Implementar lógica
        },
        visible: true
    });

    return options;
};
