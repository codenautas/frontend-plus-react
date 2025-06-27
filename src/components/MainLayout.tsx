// src/components/MainLayout.tsx
import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom'; // ¡IMPORTA Outlet AQUÍ!
import {
    Box, AppBar, Toolbar, Typography, Button, Drawer, CssBaseline,
    IconButton, useTheme, useMediaQuery
} from '@mui/material';
import { useApp } from '../contexts/AppContext';
import { useNavigate } from 'react-router-dom'; // No estoy seguro si 'useNavigate' es necesario aquí si solo se usa en SideMenu o para Logout
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import SideMenu from './SideMenu';
import useLogout from '../hooks/useLogout';

// Importamos los hooks de Redux y las acciones del nuevo slice
import { useAppDispatch, useIsDrawerOpen } from '../store';
import { setDrawerOpen, toggleDrawer } from '../store/menuUiSlice';


const drawerWidth = 240;

// const MainLayout: React.FC<MainLayoutProps> = ({ children }) => { // Quitamos { children }
const MainLayout: React.FC = () => { // MainLayout ya no recibe 'children' como prop
    const { clientContext } = useApp();
    const logout = useLogout();

    const isDrawerOpen = useIsDrawerOpen();
    const dispatch = useAppDispatch();

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    useEffect(() => {
        if (isMobile && isDrawerOpen) {
            dispatch(setDrawerOpen(false));
        }
    }, [isMobile, isDrawerOpen, dispatch]);

    const handleToggleDrawer = () => {
        dispatch(toggleDrawer());
    };

    const handleDrawerCloseMobile = () => {
        if (isMobile && isDrawerOpen) {
            dispatch(setDrawerOpen(false));
        }
    };

    // Si clientContext no existe (por ejemplo, al cargar o si la sesión falla),
    // muestra un mensaje de carga.
    // Esto es importante para evitar errores si los datos no están disponibles.
    if (!clientContext) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <Typography>Cargando diseño de la aplicación...</Typography>
            </Box>
        );
    }

    const appBarOffset = theme.mixins.toolbar;

    return (
        <Box sx={{ display: 'flex', height: '100vh' }}>
            <CssBaseline />
            <AppBar
                position="fixed"
                sx={{
                    zIndex: (theme) => theme.zIndex.drawer + 1,
                    transition: (theme) => theme.transitions.create(['width', 'margin'], {
                        easing: theme.transitions.easing.sharp,
                        duration: theme.transitions.duration.leavingScreen,
                    }),
                    ...(isDrawerOpen && {
                        width: `calc(100% - ${drawerWidth}px)`,
                        marginLeft: `${drawerWidth}px`,
                        transition: (theme) => theme.transitions.create(['width', 'margin'], {
                            easing: theme.transitions.easing.easeOut,
                            duration: theme.transitions.duration.enteringScreen,
                        }),
                    }),
                }}
            >
                <Toolbar>
                    <IconButton
                        color="inherit"
                        aria-label="open drawer"
                        onClick={handleToggleDrawer}
                        edge="start"
                        sx={{
                            marginRight: 2.2,
                        }}
                    >
                        {isDrawerOpen ? <ChevronLeftIcon /> : <MenuIcon />}
                    </IconButton>
                    <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
                        {isDrawerOpen ? '' : clientContext.config.title}
                    </Typography>
                    <Typography variant="subtitle1" component="div" sx={{ mr: 2 }}>
                        {clientContext.username}
                    </Typography>
                    <Button
                        color="inherit"
                        onClick={logout}
                        startIcon={<LogoutIcon />}
                    >
                        Salir
                    </Button>
                </Toolbar>
            </AppBar>
            <Drawer
                variant="persistent"
                anchor="left"
                open={isDrawerOpen}
                sx={{
                    width: drawerWidth,
                    flexShrink: 0,
                    '& .MuiDrawer-paper': {
                        width: drawerWidth,
                        boxSizing: 'border-box',
                        overflowX: 'hidden',
                        overflowY: 'auto',
                    },
                }}
            >
                <Toolbar
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        px: 1,
                        fontSize: '1.3rem',
                        minHeight: theme.mixins.toolbar.minHeight,
                    }}
                >
                    {isDrawerOpen ? clientContext.config.title : ''}
                </Toolbar>
                {/* Pasamos la función para cerrar el drawer al SideMenu */}
                <SideMenu onMenuItemClick={handleDrawerCloseMobile} />
            </Drawer>
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    transition: (theme) => theme.transitions.create('margin', {
                        easing: theme.transitions.easing.sharp,
                        duration: theme.transitions.duration.leavingScreen,
                    }),
                    marginLeft: `-${drawerWidth}px`,
                    ...(isDrawerOpen && {
                        transition: (theme) => theme.transitions.create('margin', {
                            easing: theme.transitions.easing.easeOut,
                            duration: theme.transitions.duration.enteringScreen,
                        }),
                        marginLeft: 0,
                    }),
                    minWidth: 0,
                    flexShrink: 0,
                    // Asegúrate de que el paddingTop sea suficiente para la AppBar
                    paddingTop: `${appBarOffset.minHeight}px`,
                    height: '100%',
                    boxSizing: 'border-box',
                    display: 'flex',
                    flexDirection: 'column',
                    width: isDrawerOpen ? `calc(100% - ${drawerWidth}px)` : '100%',
                }}
            >
                {/* ¡AQUÍ ES DONDE DEBE IR EL CONTENIDO DE LA RUTA ANIDADA! */}
                {/* Elimina {children} y reemplázalo por <Outlet /> */}
                <Outlet />
            </Box>
        </Box>
    );
};

export default MainLayout;