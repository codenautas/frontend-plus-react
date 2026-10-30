// src/pages/GenericDataGridPage.tsx
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { Box, Alert, Typography, Tabs, Tab, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import GenericDataGrid from '../components/grid/GenericDataGrid';
import { FixedField, Ancestor } from '../types';
import { cambiarGuionesBajosPorEspacios } from '../utils/functions';
import { ParametrosDeTabla, parametrosDeTabla } from '../utils/parametrosDeTabla';

interface TabItem {
    id: string;
    label: string;
    tableName: string;
    fixedFields: FixedField[];
    /** Lo que declara la dirección o el ítem de menú de la tabla principal (filtros iniciales, `td`, `pf`, `pick`) */
    parametros?: ParametrosDeTabla;
    ancestors?: Ancestor[];
}

interface GenericDataGridPageProps {
    initialTableName?: string;
    initialFixedFields?: FixedField[];
    /** Los parámetros de la tabla que ya resolvió quien la llama (el menú); sin ellos se leen de la dirección */
    parametros?: ParametrosDeTabla;
}

const GenericDataGridPage: React.FC<GenericDataGridPageProps> = ({ 
    initialTableName, 
    initialFixedFields = [],
    parametros: parametrosRecibidos
}) => {
    const { tableName: urlTableName } = useParams<{ tableName?: string }>();
    const effectiveTableName = initialTableName || urlTableName;
    
    const [tabs, setTabs] = useState<TabItem[]>([]);
    const [activeTabIdx, setActiveTabIdx] = useState(0);

    // Evitar loop infinito: solo reinicializar si el nombre de tabla cambia realmente
    // o si los parámetros de filtrado base cambian.
    const ffKey = JSON.stringify(initialFixedFields);

    const location = useLocation();
    // como backend-plus: lo de la dirección (`ff`, `fc`, `td`, `pf`, `pick`, `label`) pisa a lo del menú
    const parametros = useMemo(() => parametrosRecibidos ?? parametrosDeTabla(undefined, location.search), [parametrosRecibidos, location.search]);
    const fixedFieldsIniciales = initialFixedFields.length > 0 ? initialFixedFields : (parametros.fixedFields ?? []);
    const parametrosKey = JSON.stringify(parametros);
    React.useEffect(() => {
        if (effectiveTableName) {
            // Cada vez que cambia la tabla base (por menú o URL), reseteamos las pestañas
            setTabs([{
                id: `main-${effectiveTableName}-${ffKey}-${parametrosKey}`, // ID único que incluye filtros
                label: parametros.label ?? effectiveTableName.replace(/_/g, ' ').toUpperCase(),
                tableName: effectiveTableName,
                fixedFields: fixedFieldsIniciales,
                parametros,
                ancestors: []
            }]);
            setActiveTabIdx(0);
        }
    }, [effectiveTableName, ffKey, parametrosKey, location.key]);

    const handleOpenDetail = useCallback((tableName: string, fixedFields: FixedField[], label: string, ancestors: Ancestor[]) => {
        const tabId = `${tableName}-${JSON.stringify(fixedFields)}`;
        
        setTabs(prevTabs => {
            const existingTabIdx = prevTabs.findIndex(t => t.id === tabId);
            if (existingTabIdx !== -1) {
                setActiveTabIdx(existingTabIdx);
                return prevTabs;
            }
            const newTabs = [...prevTabs, { id: tabId, label, tableName, fixedFields, ancestors }];
            setActiveTabIdx(newTabs.length - 1);
            return newTabs;
        });
    }, []);

    const handleCloseTab = (index: number, event: React.MouseEvent) => {
        event.stopPropagation();
        if (index === 0) return; 

        const newTabs = tabs.filter((_, i) => i !== index);
        setTabs(newTabs);
        if (activeTabIdx >= newTabs.length) setActiveTabIdx(newTabs.length - 1);
        else if (activeTabIdx === index) setActiveTabIdx(index - 1);
    };

    if (!effectiveTableName) {
        return (
            <Box p={3}><Alert severity="error">No se especificó una tabla.</Alert></Box>
        );
    }

    return (
        <Box sx={{ width: '100%', height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
                <Tabs value={activeTabIdx} onChange={(_, v) => setActiveTabIdx(v)} variant="scrollable">
                    {tabs.map((tab, index) => (
                        <Tab 
                            key={tab.id} 
                            label={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography variant="caption" sx={{ fontWeight: 'bold' }}>{tab.label}</Typography>
                                    {index !== 0 && (
                                        <IconButton size="small" onClick={(e) => handleCloseTab(index, e)}>
                                            <CloseIcon fontSize="inherit" />
                                        </IconButton>
                                    )}
                                </Box>
                            } 
                        />
                    ))}
                </Tabs>
            </Box>

            {tabs.map((tab, index) => (
                <Box
                    key={tab.id}
                    role="tabpanel"
                    hidden={activeTabIdx !== index}
                    sx={{ flexGrow: 1, display: activeTabIdx === index ? 'flex' : 'none', flexDirection: 'column', overflow: 'hidden' }}
                >
                    <GenericDataGrid 
                        tableName={tab.tableName} 
                        fixedFields={tab.fixedFields} 
                        filterColumns={tab.parametros?.filterColumns}
                        tableDef={tab.parametros?.tableDef}
                        parameterFunctions={tab.parametros?.parameterFunctions}
                        pick={tab.parametros?.pick}
                        onOpenDetail={handleOpenDetail} 
                        ancestors={tab.ancestors}
                    />
                </Box>
            ))}
        </Box>
    );
};

export default GenericDataGridPage;