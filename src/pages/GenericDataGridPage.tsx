// src/pages/GenericDataGridPage.tsx
import React, { useState, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Alert, Typography, Tabs, Tab, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import GenericDataGrid from '../components/grid/GenericDataGrid';
import { FixedField } from '../types';
import { cambiarGuionesBajosPorEspacios } from '../utils/functions';

interface TabItem {
    id: string;
    label: string;
    tableName: string;
    fixedFields: FixedField[];
}

interface GenericDataGridPageProps {
    initialTableName?: string;
    initialFixedFields?: FixedField[];
}

const GenericDataGridPage: React.FC<GenericDataGridPageProps> = ({ 
    initialTableName, 
    initialFixedFields = [] 
}) => {
    const { tableName: urlTableName } = useParams<{ tableName?: string }>();
    const effectiveTableName = initialTableName || urlTableName;
    
    const [tabs, setTabs] = useState<TabItem[]>([]);
    const [activeTabIdx, setActiveTabIdx] = useState(0);

    // Evitar loop infinito: solo reinicializar si el nombre de tabla cambia realmente
    // o si los parámetros de filtrado base cambian.
    const ffKey = JSON.stringify(initialFixedFields);

    React.useEffect(() => {
        if (effectiveTableName) {
            // Cada vez que cambia la tabla base (por menú o URL), reseteamos las pestañas
            setTabs([{
                id: `main-${effectiveTableName}-${ffKey}`, // ID único que incluye filtros
                label: effectiveTableName.replace(/_/g, ' ').toUpperCase(),
                tableName: effectiveTableName,
                fixedFields: initialFixedFields
            }]);
            setActiveTabIdx(0);
        }
    }, [effectiveTableName, ffKey]);

    const handleOpenDetail = useCallback((tableName: string, fixedFields: FixedField[], label: string) => {
        const tabId = `${tableName}-${JSON.stringify(fixedFields)}`;
        
        setTabs(prevTabs => {
            const existingTabIdx = prevTabs.findIndex(t => t.id === tabId);
            if (existingTabIdx !== -1) {
                setActiveTabIdx(existingTabIdx);
                return prevTabs;
            }
            const newTabs = [...prevTabs, { id: tabId, label, tableName, fixedFields }];
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
                        onOpenDetail={handleOpenDetail} 
                    />
                </Box>
            ))}
        </Box>
    );
};

export default GenericDataGridPage;