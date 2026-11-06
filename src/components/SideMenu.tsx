import React, { useEffect, useMemo, useRef, useState } from 'react';
import { List, ListItemButton, ListItemIcon, ListItemText, Divider, Box, Typography, Collapse, TextField, InputAdornment, IconButton } from '@mui/material';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import TableChartIcon from '@mui/icons-material/TableChart';
import FolderIcon from '@mui/icons-material/Folder';
import DnsIcon from '@mui/icons-material/Dns';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import DesktopWindowsIcon from '@mui/icons-material/DesktopWindows';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';

import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { MenuInfoBase, MenuInfoMenu } from "backend-plus";
import { blue, orange, teal, indigo, red } from '@mui/material/colors';

import { useSubMenuOpenState, useAppDispatch } from '../store';
import { abrirCamino, abrirGrupo, setDrawerOpen, setSubMenuOpen } from '../store/menuUiSlice';
import { MenuListItemProps, SideMenuProps } from '../types';

import { wScreens } from '../pages/WScreens';
import { puenteBPHabilitado } from '../puente/habilitacion';
import { rutaDeItemDeMenu, rutaDeTablaDeMenu } from '../utils/menuInicial';
import { HojaDeMenu, buscarEnMenu, claveDeMenu, etiquetaDeItem, hojasDeMenu } from '../utils/busquedaDeMenu';

const CLAVE_RECIENTES = 'fpr.menu.recientes';
const MAXIMO_RECIENTES = 4;

/** Gris; con `destacado` (ítem seleccionado o grupo abierto) toma el color de su tipo. */
const getIcon = (item: MenuInfoBase, destacado: boolean = false) => {
    switch (item.menuType) {
        case "table":
            return <TableChartIcon sx={destacado ? { color: blue[700] } : undefined} />;
        case "proc":
            return <DnsIcon sx={destacado ? { color: teal[700] } : undefined} />;
        case "menu":
            return <FolderIcon sx={destacado ? { color: orange[800] } : undefined} />;
        default:
            // con el puente encendido, la pantalla que no está registrada acá se pide a backend-plus: no es una «no implementada»
            if (wScreens[item.menuType] !== undefined || puenteBPHabilitado()) {
                return <DesktopWindowsIcon sx={destacado ? { color: indigo[500] } : undefined} />;
            }
            return <WarningAmberIcon sx={destacado ? { color: red[500] } : undefined} />;
    }
};

/** Si la ruta actual es la de este ítem (que no sea un grupo). */
const estaSeleccionado = (item: MenuInfoBase, grupos: string[], currentPath: string, hash: string = ''): boolean => {
    // Obtener tableName de la URL si existe
    const pathParts = currentPath.split('/');
    const urlTableName = pathParts[1] === 'table' ? pathParts[2] : null;

    if (item.menuType === "table") {
        // Seleccionado si coincide la ruta de menú o la ruta directa de tabla
        return currentPath === rutaDeTablaDeMenu([...grupos, item.name]) || (urlTableName === (item.table || item.name));
    } else if (item.menuType === "proc") {
        return currentPath === `/procedures/${item.name}`;
    } else if (item.menuType !== "menu") {
        // las pantallas que trae el puente viven en `/bp/menu#w=<pantalla>`
        return currentPath.startsWith(`/wScreens/${item.menuType}`) || currentPath.startsWith(`/wScreens-fallback/${item.menuType}`)
            || (currentPath === '/bp/menu' && new URLSearchParams(hash.replace(/^[#?]/, '')).get('w') === item.menuType);
    }
    return false;
};

const leerRecientes = (): string[] => {
    try {
        const guardado: unknown = JSON.parse(localStorage.getItem(CLAVE_RECIENTES) ?? '[]');
        return Array.isArray(guardado) ? guardado.filter((clave): clave is string => typeof clave === 'string') : [];
    } catch {
        return [];
    }
};

const guardarRecientes = (recientes: string[]) => {
    try {
        localStorage.setItem(CLAVE_RECIENTES, JSON.stringify(recientes));
    } catch {
        // sin almacenamiento (ventana privada, bloqueado): los recientes duran hasta recargar
    }
};

const MenuListItem: React.FC<MenuListItemProps> = ({ item, level, grupos = [], hermanos = [], onMenuItemClick }) => {
    const navigate = useNavigate();
    const location = useLocation();

    const clave = claveDeMenu([...grupos, item.name]);
    const open = useSubMenuOpenState(clave);
    const dispatch = useAppDispatch();

    const handleClick = () => {
        if (item.menuType === "menu") {
            // acordeón: al abrir un grupo se cierran sus hermanos
            if (open) {
                dispatch(setSubMenuOpen({ menuName: clave, isOpen: false }));
            } else {
                dispatch(abrirGrupo({ clave, hermanos }));
            }
        } else {
            navigate(rutaDeItemDeMenu(item, grupos));
            if (onMenuItemClick) {
                onMenuItemClick();
            }
        }
    };

    const isSelected = estaSeleccionado(item, grupos, location.pathname, location.hash);

    // SCROLL AUTOMÁTICO: Cuando se selecciona un ítem, lo traemos a la vista
    const itemRef = React.useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (isSelected && itemRef.current) {
            itemRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [isSelected]);

    const contenido = item.menuType === "menu" ? (item as MenuInfoMenu).menuContent : [];

    return (
        <div ref={itemRef}>
            <ListItemButton
                onClick={handleClick}
                sx={{ pl: level * 2 }}
                selected={isSelected}
            >
                <ListItemIcon sx={{ minWidth: '38px' }}>
                    {getIcon(item, isSelected || open)}
                </ListItemIcon>
                <ListItemText primary={etiquetaDeItem(item)} />
                {item.menuType === "menu" ? (open ? <ExpandLess /> : <ExpandMore />) : null}
            </ListItemButton>
            {item.menuType === "menu" && (
                <Collapse in={open} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding>
                        {contenido.map((subItem) => (
                            <MenuListItem
                                key={subItem.name}
                                item={subItem}
                                level={level + 1}
                                grupos={[...grupos, item.name]}
                                hermanos={contenido.filter(otro => otro !== subItem).map(otro => claveDeMenu([...grupos, item.name, otro.name]))}
                                onMenuItemClick={onMenuItemClick}
                            />
                        ))}
                    </List>
                </Collapse>
            )}
        </div>
    );
};

/** Un ítem fuera del árbol (resultado de la búsqueda o reciente): lleva debajo el camino de grupos que lo contiene. */
const ItemPlano: React.FC<{ hoja: HojaDeMenu; seleccionado: boolean; traerALaVista?: boolean; onElegir: (hoja: HojaDeMenu) => void }> = ({ hoja, seleccionado, traerALaVista = false, onElegir }) => {
    const boton = useRef<HTMLDivElement>(null);
    // solo en los resultados de la búsqueda, al moverse con las flechas: en «Recientes» scrollear llevaba el menú al principio
    useEffect(() => {
        if (traerALaVista && seleccionado) boton.current?.scrollIntoView({ block: 'nearest' });
    }, [traerALaVista, seleccionado]);
    return (
        <ListItemButton dense selected={seleccionado} onClick={() => onElegir(hoja)} ref={boton}>
            <ListItemIcon sx={{ minWidth: '38px' }}>{getIcon(hoja.item, seleccionado)}</ListItemIcon>
            <ListItemText
                primary={etiquetaDeItem(hoja.item)}
                secondary={hoja.etiquetasDeGrupos.join(' › ') || undefined}
                secondaryTypographyProps={{ noWrap: true }}
            />
        </ListItemButton>
    );
};

const SideMenu: React.FC<SideMenuProps> = ({ onMenuItemClick }) => {

    const { clientContext } = useApp();
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useAppDispatch();

    const [consulta, setConsulta] = useState('');
    const [indice, setIndice] = useState(0);
    const [recientes, setRecientes] = useState<string[]>(leerRecientes);
    const campoDeBusqueda = useRef<HTMLInputElement>(null);

    const menu = clientContext?.menu;
    const hojas = useMemo(() => hojasDeMenu(menu ?? []), [menu]);
    const resultados = useMemo(() => buscarEnMenu(hojas, consulta), [hojas, consulta]);

    // Ctrl+K lleva a la búsqueda desde cualquier pantalla (abre el menú si está cerrado)
    useEffect(() => {
        const alApretar = (evento: KeyboardEvent) => {
            if ((evento.ctrlKey || evento.metaKey) && !evento.altKey && !evento.shiftKey && evento.key.toLowerCase() === 'k') {
                evento.preventDefault();
                dispatch(setDrawerOpen(true));
                setTimeout(() => {
                    campoDeBusqueda.current?.focus();
                    campoDeBusqueda.current?.select();
                }, 50);
            }
        };
        window.addEventListener('keydown', alApretar);
        return () => window.removeEventListener('keydown', alApretar);
    }, [dispatch]);

    // AUTO-EXPANSIÓN: abre los grupos del ítem que se está mostrando (y cierra los demás) y lo anota entre los recientes
    useEffect(() => {
        const actual = hojas.find(hoja => estaSeleccionado(hoja.item, hoja.grupos, location.pathname, location.hash));
        if (!actual) return;
        dispatch(abrirCamino(actual.grupos.map((_, i) => claveDeMenu(actual.grupos.slice(0, i + 1)))));
        setRecientes(anteriores => {
            // si ya está, se queda donde está: que el ítem elegido no salte de lugar
            if (anteriores.includes(actual.clave)) return anteriores;
            const nuevos = [actual.clave, ...anteriores].slice(0, MAXIMO_RECIENTES);
            guardarRecientes(nuevos);
            return nuevos;
        });
    }, [location.pathname, location.hash, hojas, dispatch]);

    if (!menu) {
        return (
            <Box sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">Cargando menú...</Typography>
            </Box>
        );
    }

    const elegir = (hoja: HojaDeMenu) => {
        navigate(rutaDeItemDeMenu(hoja.item, hoja.grupos));
        setConsulta('');
        setIndice(0);
        if (onMenuItemClick) {
            onMenuItemClick();
        }
    };

    const alApretarEnBusqueda = (evento: React.KeyboardEvent) => {
        if (evento.key === 'ArrowDown' || evento.key === 'ArrowUp') {
            evento.preventDefault();
            if (resultados.length === 0) return;
            setIndice(actual => (actual + (evento.key === 'ArrowDown' ? 1 : -1) + resultados.length) % resultados.length);
        } else if (evento.key === 'Enter') {
            evento.preventDefault();
            const hoja = resultados[indice];
            if (hoja) elegir(hoja);
        } else if (evento.key === 'Escape' && consulta !== '') {
            evento.stopPropagation();
            setConsulta('');
        }
    };

    const hojasRecientes = recientes
        .map(clave => hojas.find(hoja => hoja.clave === clave))
        .filter((hoja): hoja is HojaDeMenu => hoja !== undefined);

    return (
        <Box sx={{ width: '100%', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            {/* el buscador queda fijo; solo la lista scrollea */}
            <Box sx={{ px: 1.5, py: 1, flexShrink: 0 }}>
                <TextField
                    inputRef={campoDeBusqueda}
                    value={consulta}
                    onChange={evento => { setConsulta(evento.target.value); setIndice(0); }}
                    onKeyDown={alApretarEnBusqueda}
                    placeholder="Buscar (Ctrl+K)"
                    size="small"
                    fullWidth
                    autoComplete="off"
                    sx={{ '& .MuiInputBase-input': { fontSize: '0.8rem' } }}
                    InputProps={{
                        startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
                        endAdornment: consulta !== '' ? (
                            <InputAdornment position="end">
                                <IconButton size="small" aria-label="borrar búsqueda" edge="end" onClick={() => { setConsulta(''); campoDeBusqueda.current?.focus(); }}>
                                    <ClearIcon fontSize="small" />
                                </IconButton>
                            </InputAdornment>
                        ) : undefined,
                    }}
                />
            </Box>
            <Divider />
            <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
            {consulta.trim() !== '' ? (
                resultados.length === 0 ? (
                    <Box sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">Sin resultados</Typography>
                    </Box>
                ) : (
                    <List>
                        {resultados.map((hoja, i) => (
                            <ItemPlano key={hoja.clave} hoja={hoja} seleccionado={i === indice} traerALaVista onElegir={elegir} />
                        ))}
                    </List>
                )
            ) : (
                <>
                    {hojasRecientes.length > 0 && (
                        <>
                            <Typography variant="overline" color="text.secondary" sx={{ display: 'block', px: 2, pt: 1, lineHeight: 2 }}>
                                Recientes
                            </Typography>
                            <List disablePadding>
                                {hojasRecientes.map(hoja => (
                                    <ItemPlano
                                        key={hoja.clave}
                                        hoja={hoja}
                                        seleccionado={estaSeleccionado(hoja.item, hoja.grupos, location.pathname, location.hash)}
                                        onElegir={elegir}
                                    />
                                ))}
                            </List>
                            <Divider />
                        </>
                    )}
                    <List>
                        {menu.map((menuItem: MenuInfoBase) => (
                            <MenuListItem
                                key={menuItem.name}
                                item={menuItem}
                                level={1}
                                hermanos={menu.filter(otro => otro !== menuItem).map(otro => claveDeMenu([otro.name]))}
                                onMenuItemClick={onMenuItemClick}
                            />
                        ))}
                    </List>
                </>
            )}
            </Box>
        </Box>
    );
};

export default SideMenu;