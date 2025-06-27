// src/pages/MenuTablePage.tsx

import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Alert, Typography } from '@mui/material';
import GenericDataGrid from '../components/grid/GenericDataGrid'; // Ajusta la ruta si es necesario
import { useApp } from '../contexts/AppContext'; // Necesitamos el contexto para acceder al menú
import { MenuInfoBase, MenuInfoMenu, MenuInfoTable } from 'backend-plus'; // Asegúrate de importar tus tipos de menú

const MenuTablePage: React.FC = () => {
    // Obtiene el `menuName` de la URL para buscar en clientContext.menu
    const { menuName } = useParams<{ menuName?: string }>();
    const { clientContext } = useApp();

    // Función auxiliar para encontrar un ítem de menú recursivamente
    const findMenuItem = (items: MenuInfoBase[], nameToFind: string): MenuInfoTable | undefined => {
        for (const item of items) {
            if (item.name === nameToFind && item.menuType === "table") {
                return item as MenuInfoTable;
            }
            if (item.menuType === "menu" && (item as MenuInfoMenu).menuContent) {
                const found = findMenuItem((item as MenuInfoMenu).menuContent, nameToFind);
                if (found) return found;
            }
        }
        return undefined;
    };

    // Usa useMemo para determinar el tableName y los fixedFields desde el menú
    const { currentTableName, currentFixedFields } = useMemo(() => {
        let tableName: string | undefined = undefined;
        let fixedFields: any[] = [];
    
        if (menuName && clientContext && clientContext.menu) {
            const menuItem = findMenuItem(clientContext.menu, menuName);
            if (menuItem) {
                tableName = menuItem.table || menuItem.name;
                if(menuItem.ff){
                    Object.keys(menuItem.ff || []).forEach((fixedFieldKey)=>{
                        fixedFields.push({
                            fieldName:fixedFieldKey,
                            //@ts-ignore
                            value: menuItem.ff![fixedFieldKey]
                        })
                    })
                }
            } else {
                console.warn(`[${menuName}] Ítem de menú '${menuName}' no encontrado o no es de tipo 'table' en clientContext.menu.`);
                // Opcional: podrías redirigir o mostrar un error más amigable
            }
        }

        return {
            currentTableName: tableName,
            currentFixedFields: fixedFields,
        };
    }, [menuName, clientContext]);

    if (!currentTableName) {
        // Muestra un mensaje de error si el nombre de la tabla no se pudo determinar
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                <Alert severity="error">
                    <Typography variant="h6">Error: No se pudo cargar la información de la tabla.</Typography>
                    <Typography variant="body1">Verifique la configuración del menú o el nombre de la tabla en la URL.</Typography>
                </Alert>
            </Box>
        );
    }

    // Renderiza GenericDataGrid con los datos obtenidos del menú
    return (
        <GenericDataGrid
            tableName={currentTableName}
            fixedFields={currentFixedFields}
        />
    );
};

export default MenuTablePage;