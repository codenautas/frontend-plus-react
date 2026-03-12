import React, { useEffect } from 'react';
import { List, ListItem, ListItemButton, ListItemIcon, ListItemText, Divider, Box, Typography, Collapse } from '@mui/material';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import TableChartIcon from '@mui/icons-material/TableChart';
import FolderIcon from '@mui/icons-material/Folder';
import DnsIcon from '@mui/icons-material/Dns';
import HomeIcon from '@mui/icons-material/Home';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import DesktopWindowsIcon from '@mui/icons-material/DesktopWindows';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';

import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { MenuInfoBase, MenuInfoTable, MenuInfoProc, MenuInfoMenu } from "backend-plus";
import { blue, orange, teal, red, grey } from '@mui/material/colors';

import { useSubMenuOpenState, useAppDispatch, useAppSelector } from '../store';
import { toggleSubMenu, setAllSubMenusOpen, setSubMenuOpen } from '../store/menuUiSlice';
import { MenuListItemProps, SideMenuProps } from '../types';

import { wScreens } from '../pages/WScreens';

const MenuListItem: React.FC<MenuListItemProps> = ({ item, level, onMenuItemClick }) => {
    const navigate = useNavigate();
    const location = useLocation();

    const open = useSubMenuOpenState(item.name);
    const dispatch = useAppDispatch();

    const handleClick = () => {
        if (item.menuType === "menu") {
            dispatch(toggleSubMenu(item.name));
        } else {
            let path = '';
            const queryParams = new URLSearchParams();

            if (item.menuType === "table") {
                // Todas las tablas del menú navegan a esta ruta uniforme
                path = `/menu/${item.name}`;

                // Los parámetros td y fc siguen siendo query params
                if (item.td) queryParams.append('td', JSON.stringify((item.td)));
                if (item.fc) queryParams.append('fc', JSON.stringify((item.fc)));

                // NOTA: Los `fixedFields` (item.ff) NO se pasan en los queryParams aquí.
                // Se espera que GenericDataGridPage los obtenga directamente desde clientContext.menu
                // usando el `item.name` que está en la URL (`:menuName`).

                if (queryParams.toString()) {
                    path = `${path}?${queryParams.toString()}`;
                }
            } else if (item.menuType === "proc") {
                path = `/procedures/${item.name}`;
            } else {
                const WScreenComponent = wScreens[item.menuType];
                if (WScreenComponent !== undefined) {
                    path = `/wScreens/${item.menuType}`;
                } else {
                    path = `/wScreens-fallback/${item.menuType}`;
                    console.warn(`Menu type '${item.menuType}' no reconocido o WScreen no mapeada.`);
                }
            }

            if (path) {
                navigate(path);
            }
            if (onMenuItemClick) {
                onMenuItemClick();
            }
        }
    };

    const getIcon = (item: MenuInfoBase) => {
        switch (item.menuType) {
            case "table":
                return <TableChartIcon sx={{ color: blue[700] }} />;
            case "proc":
                return <DnsIcon sx={{ color: teal[700] }} />;
            case "menu":
                return <FolderIcon sx={{ color: orange[800] }} />;
            default:
                const WScreenComponent = wScreens[item.menuType];
                if (WScreenComponent !== undefined) {
                    return <DesktopWindowsIcon sx={{ color: grey[700] }} />;
                }
                return <WarningAmberIcon sx={{ color: red[500] }} />;
        }
    };

    const currentPath = location.pathname;
    let isSelected = false;

    // Obtener tableName de la URL si existe
    const pathParts = currentPath.split('/');
    const urlTableName = pathParts[1] === 'table' ? pathParts[2] : null;

    if (item.menuType === "table") {
        // Seleccionado si coincide la ruta de menú o la ruta directa de tabla
        isSelected = currentPath === `/menu/${item.name}` || (urlTableName === (item.table || item.name));
    } else if (item.menuType === "proc") {
        isSelected = currentPath === `/procedures/${item.name}`;
    } else if (item.menuType !== "menu") {
        isSelected = currentPath.startsWith(`/wScreens/${item.menuType}`) || currentPath.startsWith(`/wScreens-fallback/${item.menuType}`);
    }

    // SCROLL AUTOMÁTICO: Cuando se selecciona un ítem, lo traemos a la vista
    const itemRef = React.useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (isSelected && itemRef.current) {
            itemRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [isSelected]);

    return (
        <div ref={itemRef}>
            <ListItemButton
                onClick={handleClick}
                sx={{ pl: level * 2 }}
                selected={isSelected}
            >
                <ListItemIcon sx={{ minWidth: '38px' }}>
                    {getIcon(item)}
                </ListItemIcon>
                <ListItemText primary={item.label || item.name} />
                {item.menuType === "menu" ? (open ? <ExpandLess /> : <ExpandMore />) : null}
            </ListItemButton>
            {item.menuType === "menu" && (
                <Collapse in={open} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding>
                        {(item as MenuInfoMenu).menuContent.map((subItem) => (
                            <MenuListItem
                                key={subItem.name}
                                item={subItem}
                                level={level + 1}
                                onMenuItemClick={onMenuItemClick}
                            />
                        ))}
                    </List>
                </Collapse>
            )}
        </div>
    );
};


const SideMenu: React.FC<SideMenuProps> = ({ onMenuItemClick }) => {

    const { clientContext } = useApp();
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useAppDispatch();

    const subMenuOpenStates = useAppSelector(state => state.menuUi.subMenuOpenStates);

    const allSubMenusKeys = Object.keys(subMenuOpenStates);
    const openSubMenusCount = allSubMenusKeys.filter(key => subMenuOpenStates[key]).length;
    const isMostlyOpen = allSubMenusKeys.length > 0 && openSubMenusCount / allSubMenusKeys.length > 0.5;

    const handleHomeClick = () => {
        navigate('/home');
        if (onMenuItemClick) {
            onMenuItemClick();
        }
    };

    const handleToggleAllSubMenus = () => {
        dispatch(setAllSubMenusOpen(!isMostlyOpen));
    };

    if (!clientContext || !clientContext.menu) {
        return (
            <Box sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">Cargando menú...</Typography>
            </Box>
        );
    }

    const isHomeSelected = location.pathname === '/home';

    // AUTO-EXPANSIÓN: Expandir padres según la ruta actual
    useEffect(() => {
        if (!clientContext?.menu) return;

        const expandParents = (items: MenuInfoBase[], targetPath: string, parentNames: string[] = []): boolean => {
            const pathParts = targetPath.split('/');
            const urlTableName = pathParts[1] === 'table' ? pathParts[2] : null;

            for (const item of items) {
                let matches = false;
                if (item.menuType === "table") {
                    matches = targetPath === `/menu/${item.name}` || (urlTableName === (item.table || item.name));
                } else if (item.menuType === "proc") {
                    matches = targetPath === `/procedures/${item.name}`;
                } else if (item.menuType !== "menu") {
                    matches = targetPath.startsWith(`/wScreens/${item.menuType}`) || targetPath.startsWith(`/wScreens-fallback/${item.menuType}`);
                }

                if (matches) {
                    // Encontramos el ítem, expandimos todos sus padres
                    parentNames.forEach(name => {
                        dispatch(setSubMenuOpen({ menuName: name, isOpen: true }));
                    });
                    return true;
                }

                if (item.menuType === "menu") {
                    const found = expandParents((item as MenuInfoMenu).menuContent, targetPath, [...parentNames, item.name]);
                    if (found) return true;
                }
            }
            return false;
        };

        expandParents(clientContext.menu, location.pathname);
    }, [location.pathname, clientContext, dispatch]);

    return (
        <Box sx={{ width: '100%', flexShrink: 0 }}>
            {clientContext.menu.some(item => item.menuType === "menu") && (
                <ListItem disablePadding>
                    <ListItemButton onClick={handleToggleAllSubMenus}>
                        <ListItemIcon sx={{ minWidth: '38px' }}>
                            {isMostlyOpen ? <UnfoldLessIcon /> : <UnfoldMoreIcon />}
                        </ListItemIcon>
                        <ListItemText primary={isMostlyOpen ? "colapsar " : "expandir"} />
                    </ListItemButton>
                </ListItem>
            )}
            <Divider />
            <List>
                <ListItem disablePadding>
                    <ListItemButton onClick={handleHomeClick} selected={isHomeSelected}>
                        <ListItemIcon sx={{ minWidth: '38px' }}>
                            <HomeIcon />
                        </ListItemIcon>
                        <ListItemText primary="Inicio" />
                    </ListItemButton>
                </ListItem>
                <Divider />
                {clientContext.menu.map((menuItem: MenuInfoBase) => (
                    <MenuListItem
                        key={menuItem.name}
                        item={menuItem}
                        level={1}
                        onMenuItemClick={onMenuItemClick}
                    />
                ))}
            </List>
        </Box>
    );
};

export default SideMenu;