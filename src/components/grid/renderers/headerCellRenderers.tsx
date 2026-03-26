import { Box, IconButton, Tooltip, Typography } from "@mui/material";
import SearchIcon from '@mui/icons-material/Search';
import SearchOffIcon from '@mui/icons-material/SearchOff';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import AddIcon from '@mui/icons-material/Add';
import { RenderHeaderCellProps } from "react-data-grid";
import { DetailTable } from "backend-plus";
import { FieldDefinition } from "../../../types";

interface ExtendedRenderHeaderCellProps<R, SR> extends RenderHeaderCellProps<R, SR> {
    sortColumns?: readonly { columnKey: string; direction: 'ASC' | 'DESC' }[];
}

export const defaultColumnHeaderCellRenderer = (props: ExtendedRenderHeaderCellProps<any, unknown>, fieldDef: FieldDefinition) => {
    const { column, sortColumns } = props;
    const isPrimaryKey = fieldDef.isPk;

    // Lógica de flecha de ordenación
    const sortIndex = sortColumns?.findIndex((s: { columnKey: string }) => s.columnKey === column.key);
    const sorted = sortIndex !== undefined && sortIndex !== -1;
    const sortColumn = sorted ? sortColumns![sortIndex] : null;

    // Colores degradados según la prioridad
    const getSortColor = (index: number) => {
        if (index === 0) return '#000000'; // Principal: Negro
        if (index === 1) return '#555555'; // Secundario: Gris oscuro
        if (index === 2) return '#888888'; // Terciario: Gris medio
        return '#AAAAAA'; // Otros: Gris claro
    };

    const sortColor = sorted ? getSortColor(sortIndex) : 'transparent';

    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '4px',
                boxSizing: 'border-box',
                height: '100%',
                width: '100%',
            }}
        >
            <Typography
                variant="body2"
                sx={{
                    fontWeight: 'bold',
                    textDecoration: isPrimaryKey ? 'underline' : 'none',
                    fontSize: '0.930rem',
                    textAlign: 'left',
                    flexGrow: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                }}
            >
                {column.name}
            </Typography>
            {sorted && (
                <Box sx={{ color: sortColor, display: 'flex', alignItems: 'center', ml: 0.5, fontSize: '0.7rem' }}>
                    {sortColumn?.direction === 'ASC' ? '\u25B2' : '\u25BC'}
                </Box>
            )}
        </Box>
    );
}

export const actionsColumnHeaderCellRenderer = (
    props: RenderHeaderCellProps<any, unknown>,
    isFilterRowVisible: boolean,
    toggleFilterVisibility: () => void,
    handleDataGridOptions: (event: React.MouseEvent<HTMLElement>) => void,
    handleAddRow: () => void,
    allowInsert?: boolean
) => {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 0.2 }}>
            {allowInsert && (
                <IconButton
                    color="inherit"
                    onClick={handleAddRow}
                    size="small"
                    title="Añadir registro"
                    sx={{ p: 0.25 }}
                >
                    <AddIcon sx={{ fontSize: 18, color: 'success.main' }} />
                </IconButton>
            )}
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
                size="small"
                title="Opciones de esta tabla"
                sx={{ p: 0.25 }}
            >
                <MoreVertIcon sx={{ fontSize: 20, variant: "filled", size: "small" }} />
            </IconButton>
        </Box>
    );
};

export const detailColumnCellHeaderRenderer = (props: RenderHeaderCellProps<any, unknown>, detailTable: DetailTable) =>
    <Tooltip title={detailTable.label}>
        <Typography variant="caption" sx={{ fontSize: '0.75rem', fontWeight: 'bold' }}>
            {detailTable.abr.toUpperCase()}
        </Typography>
    </Tooltip>