import {Box, IconButton, Tooltip, Typography} from "@mui/material";
import SearchIcon from '@mui/icons-material/Search';
import SearchOffIcon from '@mui/icons-material/SearchOff';
import MoreVertIcon from '@mui/icons-material/MoreVert';
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
                    fontSize: 'o.930rem', // Puedes ajustar el tamaño si es necesario
                }}
            >
                {column.name}
            </Typography>
        </Box>
    );
}

export const actionsColumnHeaderCellRenderer = (
    props: RenderHeaderCellProps<any, unknown>, 
    isFilterRowVisible:boolean, 
    toggleFilterVisibility: () => void, 
    handleDataGridOptions: (event: React.MouseEvent<HTMLElement>) => void
) =>
    <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 0.2}}> 
        <IconButton
            color="inherit"
            onClick={toggleFilterVisibility}
            size="small"
            title={isFilterRowVisible ? 'Ocultar filtros' : 'Mostrar filtros'}
            sx={{ p: 0.25 }}
        >
            {isFilterRowVisible ? <SearchOffIcon sx={{ fontSize: 18 }} /> : <SearchIcon sx={{ fontSize: 18 }} />}
        </IconButton>
        <IconButton
            onClick={(event) => handleDataGridOptions(event)}
            size ="small"
            title = "Opciones de esta tabla"
            sx={{ p: 0.25 }}
        >
            <MoreVertIcon sx={{ fontSize: 20, variant: "filled", size: "small" }} />
        </IconButton>
    </Box>
    

export const detailColumnCellHeaderRenderer = (props: RenderHeaderCellProps<any, unknown>, detailTable:DetailTable) => 
    <Tooltip title={detailTable.label}>
        <Typography variant="caption" sx={{ fontSize: '0.75rem', fontWeight: 'bold' }}>
            {detailTable.abr.toUpperCase()}
        </Typography>
    </Tooltip>