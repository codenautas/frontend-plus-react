import {
    Popover,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Paper,
    CircularProgress,
    Box
} from '@mui/material';
import { useState } from 'react';
import { DataGridOption } from '../types';

interface DataGridOptionsDialogProps {
    open: boolean;
    onClose: () => void;
    options: DataGridOption[];
    anchorEl: HTMLElement | null;
}

export const DataGridOptionsDialog: React.FC<DataGridOptionsDialogProps> = ({ 
    open, 
    onClose, 
    options,
    anchorEl
}) => {
    const [isExecuting, setIsExecuting] = useState(false);

    const handleOptionClick = async (handler: () => Promise<void>) => {
        try {
            setIsExecuting(true);
            await handler();
        } catch (error) {
            console.error('Error ejecutando handler:', error);
        } finally {
            setIsExecuting(false);
            onClose();
        }
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
                <Paper sx={{ minWidth: 150, maxWidth: 350 }}>
                    {isExecuting && (
                        <Box 
                            sx={{ 
                                display: 'flex', 
                                justifyContent: 'center', 
                                alignItems: 'center',
                                p: 5
                            }}
                        >
                            <CircularProgress size={40} />
                        </Box>
                    )}
                    {!isExecuting && (
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
                            {options
                                .filter(option => option.visible !== false)
                                .map((option) => (
                                    <ListItemButton 
                                        key={option.id}
                                        onClick={() => handleOptionClick(option.handler)}
                                    >
                                        <ListItemIcon>
                                            {option.icon}
                                        </ListItemIcon>
                                        <ListItemText primary={option.label} />
                                    </ListItemButton>
                                ))
                            }
                        </List>
                    )}
                </Paper>
            </Popover>
        </>
    );
};