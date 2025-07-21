import {Box, IconButton, Tooltip, Typography} from "@mui/material";
import SearchIcon from '@mui/icons-material/Search';
import SearchOffIcon from '@mui/icons-material/SearchOff';
import { RenderHeaderCellProps } from "react-data-grid";
import { DetailTable } from "backend-plus";
import { FieldDefinition } from "../../../types";

export const defaultColumnHeaderCellRenderer = (props: RenderHeaderCellProps<any, unknown>, fieldDef:FieldDefinition) => {
    const { column } = props;
    const isPrimaryKey = fieldDef.isPk;
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'flex-start',
                padding: '4px',
                boxSizing: 'border-box',
                height: '100%',
            }}
        >
            <Typography
                variant="body2"
                sx={{
                    fontWeight: 'bold',
                    textDecoration: isPrimaryKey ? 'underline' : 'none',
                    fontSize: '0.875rem', // Puedes ajustar el tamaño si es necesario
                }}
            >
                {column.name}
            </Typography>
        </Box>
    );
}

export const actionsColumnHeaderCellRenderer = (props: RenderHeaderCellProps<any, unknown>, isFilterRowVisible:boolean, toggleFilterVisibility: Function) =>
    <IconButton
        color="inherit"
        onClick={toggleFilterVisibility}
        size="small"
        title={isFilterRowVisible ? 'Ocultar filtros' : 'Mostrar filtros'}
        sx={{ p: 0.5 }}
    >
        {isFilterRowVisible ? <SearchOffIcon sx={{ fontSize: 20 }} /> : <SearchIcon sx={{ fontSize: 20 }} />}
    </IconButton>

export const detailColumnCellHeaderRenderer = (props: RenderHeaderCellProps<any, unknown>, detailTable:DetailTable) => 
    <Tooltip title={detailTable.label}>
        <Typography variant="caption" sx={{ fontSize: '0.75rem', fontWeight: 'bold' }}>
            {detailTable.abr.toUpperCase()}
        </Typography>
    </Tooltip>