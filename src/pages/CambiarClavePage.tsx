import React, { useState } from 'react';
import { Alert, Box, Button, CircularProgress, TextField, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../store';
import { clearClientContext } from '../store/clientContextSlice';
import { setRedirectPath } from '../store/routerSlice';
import { useApp } from '../contexts/AppContext';
import { fetchApi } from '../utils/fetchApi';
import { resultadoDeCambioDeClave } from '../utils/cambiarClave';
import { mensajeDeError } from '../utils/errores';

/** Cambio de contraseña del usuario que inició sesión, como `/chpass` de backend-plus (al cambiarla el servidor cierra la sesión). */
const CambiarClavePage: React.FC = () => {
    const { clientContext, setIsLoggedIn, avisarCierreVoluntario } = useApp();
    const dispatch = useDispatch<AppDispatch>();
    const navigate = useNavigate();

    const [claveActual, setClaveActual] = useState('');
    const [claveNueva, setClaveNueva] = useState('');
    const [claveRepetida, setClaveRepetida] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [enviando, setEnviando] = useState(false);

    const enviar = async (evento: React.FormEvent) => {
        evento.preventDefault();
        setError(null);
        if (claveNueva !== claveRepetida) {
            setError('La clave nueva y su repetición no coinciden');
            return;
        }
        setEnviando(true);
        // si la clave cambia, el servidor cierra la sesión: eso no es una sesión expirada
        avisarCierreVoluntario(true);
        try {
            const respuesta = await fetchApi('/chpass', {
                method: 'POST',
                body: new URLSearchParams({ oldPassword: claveActual, newPassword: claveNueva, repPassword: claveRepetida }),
            });
            const resultado = resultadoDeCambioDeClave(respuesta.url, await respuesta.text());
            if (!resultado.ok) {
                avisarCierreVoluntario(false);
                setError(resultado.mensaje);
                return;
            }
            // el servidor ya cerró la sesión: se limpia el estado local, como al salir, y se vuelve a ingresar con la clave nueva
            setIsLoggedIn(false);
            dispatch(clearClientContext());
            dispatch(setRedirectPath(null));
            navigate('/login', { replace: true, state: { claveCambiada: true } });
        } catch (err) {
            avisarCierreVoluntario(false);
            setError(mensajeDeError(err, 'No se pudo cambiar la contraseña'));
        } finally {
            setEnviando(false);
        }
    };

    return (
        <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
            <Box component="form" onSubmit={enviar} sx={{ width: '100%', maxWidth: 420 }}>
                <Typography variant="h5" gutterBottom>Cambiar contraseña</Typography>
                <TextField label="Usuario" value={clientContext?.username ?? ''} fullWidth margin="normal" disabled autoComplete="username" />
                <TextField
                    label="Contraseña actual" type="password" value={claveActual} onChange={e => setClaveActual(e.target.value)}
                    fullWidth margin="normal" autoFocus required autoComplete="current-password" disabled={enviando}
                />
                <TextField
                    label="Contraseña nueva" type="password" value={claveNueva} onChange={e => setClaveNueva(e.target.value)}
                    fullWidth margin="normal" required autoComplete="new-password" disabled={enviando}
                />
                <TextField
                    label="Repetir contraseña nueva" type="password" value={claveRepetida} onChange={e => setClaveRepetida(e.target.value)}
                    fullWidth margin="normal" required autoComplete="new-password" disabled={enviando}
                />
                {error && <Alert severity="error" sx={{ mt: 1, whiteSpace: 'pre-line' }}>{error}</Alert>}
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mt: 2 }}>
                    <Button onClick={() => navigate(-1)} disabled={enviando}>Cancelar</Button>
                    <Button type="submit" variant="contained" disabled={enviando}>
                        {enviando ? <CircularProgress size={20} /> : 'Cambiar contraseña'}
                    </Button>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
                    Al cambiarla se cierra la sesión: hay que ingresar de nuevo con la clave nueva.
                </Typography>
            </Box>
        </Box>
    );
};

export default CambiarClavePage;
