import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DataGrid, Column } from 'react-data-grid';
import { TableDefinition, FieldDefinition, DetailTable } from "backend-plus";
import { fetchApi } from '../../utils/fetchApi'; 
import { CircularProgress, Typography, Box, Alert } from '@mui/material';
import { quitarGuionesBajos } from '../../utils/functions';
import { GenericDataGridForDetailProps } from '../../types';

// Función de utilidad para obtener los valores de la clave primaria
// Asumiendo que esta función existe y es correcta para tu lógica de negocio
const getPrimaryKeyValues = (row: any, primaryKey: string[]): string => {
    return primaryKey.map(key => row[key]).join('-');
};

const GenericDataGridForDetail: React.FC<GenericDataGridForDetailProps> = ({
    parentRow,
    detailTableDefinition,
    parentTableName,
}) => {
    const [tableDefinition, setTableDefinition] = useState<TableDefinition | null>(null);
    const [tableData, setTableData] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    // Se inicializa expandedRowIds con useState para que el estado sea gestionado por React
    // NOTA: expandedRowIds y handleRowExpandChange ya no se usan directamente en DataGrid
    // si las props 'expandedGroupIds' y 'onRowExpandChange' han sido eliminadas.
    // Se mantienen aquí por si la lógica de la aplicación los necesita para otros fines.
    const [expandedRowIds, setExpandedRowIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        const loadDetailData = async () => {
            setLoading(true);
            setError(null);
            try {
                // Cargar la definición de la tabla de detalle
                // Se usa detailTableDefinition.table en lugar de .name
                const bodyDefinition = new URLSearchParams({
                    table: detailTableDefinition.table!,
                });
                const responseDefinition = await fetchApi(`/table_structure`, {
                    method: 'POST',
                    body: bodyDefinition
                });
                if (responseDefinition.ok) {
                    const rawResponseTextDefinition = await responseDefinition.text();
                    const definition = JSON.parse(rawResponseTextDefinition.replace(/^--\n/, ''));
                    setTableDefinition(definition);
                } else {
                    const errorTextDefinition = await responseDefinition.text();
                    throw new Error(`Error al cargar la estructura de la tabla de detalle '${detailTableDefinition.table}': ${responseDefinition.status} - ${errorTextDefinition}`);
                }

                // Construir los parámetros de filtro para la tabla de detalle
                const filterParams: Record<string, any> = {};
                detailTableDefinition.fields.forEach(field => {
                    // Manejo de los tipos de FieldsForConnectDetailTable
                    // Asegurarse de que el campo sea un objeto y no nulo antes de intentar acceder a sus propiedades
                    if (typeof field === 'object' && field !== null) {
                        let paramValue: any;
                        let paramName: string | undefined;

                        if ('source' in field && field.source) {
                            // Si tiene 'source', el valor viene de parentRow[field.source]
                            paramValue = parentRow[field.source];
                            paramName = field.target; // El nombre del parámetro en la URL es field.target
                        } else if ('value' in field && field.value) {
                            // Si tiene 'value', el valor es field.value
                            paramValue = field.value;
                            paramName = field.target; // El nombre del parámetro en la URL es field.target
                        } else if ('target' in field && field.target) {
                            // Si solo hay 'target', asume que el valor viene del mismo nombre de campo en parentRow
                            paramValue = parentRow[field.target];
                            paramName = field.target;
                        }

                        // Solo añadir el parámetro si el valor no es undefined o null
                        if (paramName && paramValue !== undefined && paramValue !== null) {
                            filterParams[paramName] = paramValue;
                        }
                    } else if (typeof field === 'string') {
                        // Si es un string, asume que es el nombre del campo en parentRow y también el target
                        const paramValue = parentRow[field];
                        if (paramValue !== undefined && paramValue !== null) {
                            filterParams[field] = paramValue;
                        }
                    }
                });

                // Construir el body para la llamada a fetchApi para obtener los datos
                // Se asume que fetchApi espera un body con 'table' y 'fixedFields' (JSON string)
                const bodyData = new URLSearchParams({
                    table: detailTableDefinition.table!, // Se usa detailTableDefinition.table
                    fixedFields: JSON.stringify(filterParams) // Serializar filterParams a JSON string
                });

                const responseData = await fetchApi(`/table_data`, { // Ruta para obtener datos de la tabla
                    method: 'POST',
                    body: bodyData
                });

                if (responseData.ok) {
                    const rawResponseTextData = await responseData.text();
                    const data = JSON.parse(rawResponseTextData.replace(/^--\n/, ''));
                    setTableData(data);
                } else {
                    const errorTextData = await responseData.text();
                    throw new Error(`Error al cargar los datos de la tabla de detalle '${detailTableDefinition.table}': ${responseData.status} - ${errorTextData}`);
                }

            } catch (err: any) {
                console.error("Error al cargar datos de detalle:", err);
                setError(`Error al cargar los datos de detalle: ${err.message || 'Error desconocido'}`);
            } finally {
                setLoading(false);
            }
        };

        loadDetailData();
    }, [parentRow, detailTableDefinition]); // Dependencias: parentRow, detailTableDefinition

    const primaryKey = useMemo(() => {
        if (!tableDefinition) return ['id'];
        return tableDefinition.primaryKey || ['id'];
    }, [tableDefinition]);

    const columns: Column<any>[] = useMemo(() => {
        if (!tableDefinition) return [];

        return tableDefinition.fields.map((field: FieldDefinition) => ({
            key: field.name,
            name: quitarGuionesBajos(field.label || field.name),
            resizable: true,
            sortable: true,
        }));
    }, [tableDefinition]);

    // Se ha tipado directamente el parámetro 'props' del renderDetail
    // NOTA: 'renderDetail' ya no es una prop válida en DataGrid.
    // Si necesitas filas de detalle, consulta la documentación de react-data-grid
    // para 'detailPanel' o la combinación de 'rowGrouper' y 'renderGroupCell'.
    const rowDetailRenderer = useCallback((props: { row: any }) => {
        const { row } = props;
        if (!tableDefinition || !tableDefinition.detailTables) {
            return null;
        }

        return (
            <div style={{ padding: '16px' }}>
                {tableDefinition.detailTables.map((detailTable: DetailTable, index: number) => (
                    <GenericDataGridForDetail
                        // Se usa detailTable.table para la key, asumiendo que siempre está presente
                        key={detailTable.table || `nested-detail-${index}`}
                        parentRow={row}
                        detailTableDefinition={detailTable}
                        parentTableName={detailTableDefinition.table!} // El padre de este detalle es la tabla actual
                    />
                ))}
            </div>
        );
    }, [tableDefinition, detailTableDefinition.table]); // Se usa .table en las dependencias

    // NOTA: handleRowExpandChange ya no se usa directamente en DataGrid
    // si las props 'expandedGroupIds' y 'onRowExpandChange' han sido eliminadas.
    const handleRowExpandChange = useCallback((rowKey: string, expanded: boolean) => {
        setExpandedRowIds((prevExpandedRowIds) => {
            const newExpandedRowIds = new Set(prevExpandedRowIds);
            if (expanded) {
                newExpandedRowIds.add(rowKey);
            } else {
                newExpandedRowIds.delete(rowKey);
            }
            return newExpandedRowIds;
        });
    }, []);

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="100px">
                <CircularProgress size={20} />
                <Typography variant="body2" sx={{ ml: 1 }}>Cargando detalle...</Typography>
            </Box>
        );
    }

    if (error) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="100px">
                <Alert severity="error" sx={{ width: '100%' }}>{error}</Alert>
            </Box>
        );
    }

    if (!tableDefinition) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="100px">
                <Alert severity="warning" sx={{ width: '100%' }}>No se pudo cargar la definición de la tabla de detalle.</Alert>
            </Box>
        );
    }

    // TS7053 y TS2322: Manejo seguro del acceso a detailTableDefinition.fields[0]
    const firstDetailField = detailTableDefinition.fields[0];
    let parentRowDisplayValue = 'N/A'; // Valor por defecto

    if (firstDetailField && typeof firstDetailField === 'object' && ('source' in firstDetailField || 'target' in firstDetailField)) {
        // Si es un objeto y tiene 'source' o 'target'
        const keyToAccess = ('source' in firstDetailField && firstDetailField.source) ? firstDetailField.source : (('target' in firstDetailField && firstDetailField.target) ? firstDetailField.target : undefined);
        if (keyToAccess && parentRow && typeof parentRow === 'object' && keyToAccess in parentRow) {
            parentRowDisplayValue = parentRow[keyToAccess];
        }
    } else if (typeof firstDetailField === 'string' && parentRow && typeof parentRow === 'object' && firstDetailField in parentRow) {
        // Si es un string (nombre de campo)
        parentRowDisplayValue = parentRow[firstDetailField];
    }


    return (
        <Box sx={{ p: 1, border: '1px solid #e0e0e0', borderRadius: '8px', mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
                {quitarGuionesBajos(tableDefinition.title || tableDefinition.name)}{" "}
                (Registros para {parentRowDisplayValue})
            </Typography>
            <DataGrid
                columns={columns}
                rows={tableData}
                // TS7006: Parámetro 'row' tipado explícitamente como 'any'
                rowKeyGetter={(row: any) => getPrimaryKeyValues(row, primaryKey)}
                // renderDetail={rowDetailRenderer} // Eliminado: Esta prop ya no existe en versiones recientes de react-data-grid
                // expandedGroupIds={Array.from(expandedRowIds)} // Eliminado: Esta prop ya no existe en versiones recientes de react-data-grid
                // onRowExpandChange={handleRowExpandChange} // Eliminado: Esta prop ya no existe en versiones recientes de react-data-grid
            />
        </Box>
    );
};

export default GenericDataGridForDetail;
