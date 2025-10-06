import {
    Popover,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Divider,
    Paper
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import FilterAltIcon from '@mui/icons-material/FilterAlt';

interface TableOptionsDialogProps {
    open: boolean;
    onClose: () => void;
    onOptionSelect: (option: string) => void;
    anchorEl: HTMLElement | null;
}

export const TableOptionsDialog: React.FC<TableOptionsDialogProps> = ({ 
    open, 
    onClose, 
    onOptionSelect,
    anchorEl
}) => {
    const handleOptionClick = (option: string) => {
        onOptionSelect(option);
        onClose();
    };

    return (
        <>
            {open && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.2)',
                        zIndex: 1200,
                        pointerEvents: 'none'
                    }}
                />
            )}
            <Popover
                open={open}
                anchorEl={anchorEl}
                onClose={onClose}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'left',
                }}
                slotProps={{
                    paper: {
                        sx: {
                            zIndex: 1300,
                        }
                    }
                }}
            >
            <Paper sx={{ minWidth: 100, maxWidth: 350 }}>
                <List sx={{ 
                    py: 0,
                    '& .MuiListItemButton-root': { 
                        py: 0.5, 
                        px: 1.5,
                        minHeight: 36
                    },
                    '& .MuiListItemIcon-root': { 
                        minWidth: 32 
                    },
                    '& .MuiListItemText-primary': { 
                        fontSize: '0.85rem' 
                    },
                    '& .MuiSvgIcon-root': {
                        fontSize: 18
                    }
                }}>
                    <ListItemButton onClick={() => handleOptionClick('refresh')}>
                        <ListItemIcon>
                            <RefreshIcon />
                        </ListItemIcon>
                        <ListItemText primary="refrescar la grilla desde la base de datos" />
                    </ListItemButton>
                    
                    <ListItemButton onClick={() => handleOptionClick('showColumns')}>
                        <ListItemIcon>
                            <ViewColumnIcon />
                        </ListItemIcon>
                        <ListItemText primary="mostrar las columnas relacionadas" />
                    </ListItemButton>
                    
                    <ListItemButton onClick={() => handleOptionClick('hideColumns')}>
                        <ListItemIcon>
                            <VisibilityOffIcon />
                        </ListItemIcon>
                        <ListItemText primary="ocultar o mostrar columnas" />
                    </ListItemButton>
                    
                    <ListItemButton onClick={() => handleOptionClick('export')}>
                        <ListItemIcon>
                            <FileDownloadIcon />
                        </ListItemIcon>
                        <ListItemText primary="exportar" />
                    </ListItemButton>
                    
                    <ListItemButton onClick={() => handleOptionClick('import')}>
                        <ListItemIcon>
                            <FileUploadIcon />
                        </ListItemIcon>
                        <ListItemText primary="importar" />
                    </ListItemButton>
                    
                    <ListItemButton onClick={() => handleOptionClick('deleteAll')}>
                        <ListItemIcon>
                            <DeleteSweepIcon />
                        </ListItemIcon>
                        <ListItemText primary="borrar todos los registros" />
                    </ListItemButton>
                    
                    <ListItemButton onClick={() => handleOptionClick('completeTable')}>
                        <ListItemIcon>
                            <FilterAltIcon />
                        </ListItemIcon>
                        <ListItemText primary="tabla completa y filtrada" />
                    </ListItemButton>
                </List>
            </Paper>
        </Popover>
        </>
    );
};