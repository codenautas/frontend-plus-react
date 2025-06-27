import React, { useState } from 'react';
import { Button, TextField, Typography, Alert, AlertTitle, Box, CircularProgress } from '@mui/material'; // Importaciones de MUI
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate } from 'react-router-dom';

// --- ¡NUEVAS IMPORTACIONES DE REDUX! ---
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../store'; // Asegúrate de que la ruta sea correcta
import { fetchClientContext } from '../store/clientContextSlice'; // Importa el thunk para cargar el contexto

import { useApp } from '../contexts/AppContext'; // Sigue importando useApp para setIsLoggedIn y checkSession
import { fetchApi } from '../utils/fetchApi'; // Tu utilidad fetchApi

// Define el esquema de validación con Zod
const loginSchema = z.object({
    username: z.string().min(1, "El usuario es requerido"), // Añadir validación básica
    password: z.string().min(1, "La contraseña es requerida"), // Añadir validación básica
});

// Define el tipo para los datos del formulario
type LoginFormValues = z.infer<typeof loginSchema>;

const LoginPage = () => {
    const navigate = useNavigate();
    const [loginError, setLoginError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Obtiene setIsLoggedIn y checkSession del contexto de la aplicación
    const { setIsLoggedIn, checkSession } = useApp(); 

    // Obtiene el dispatch de Redux
    const dispatch = useDispatch<AppDispatch>();

    const {
        control,
        handleSubmit,
        formState: { errors },
        reset
    } = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            username: '',
            password: '',
        },
    });

    const onSubmit = async (data: LoginFormValues) => {
        setIsSubmitting(true);
        setLoginError(null); // Limpia cualquier error anterior

        try {
            const body = new URLSearchParams({
                username: data.username,
                password: data.password
            });

            const loginResponse = await fetchApi('/login', {
                method: 'POST',
                body, // URLSearchParams se envía directamente como body para form-urlencoded
                // Asegúrate de que el Content-Type en el backend maneje 'application/x-www-form-urlencoded'
            });

            // Si el backend redirige a /menu, significa que el login fue exitoso.
            // Si la respuesta no es OK, o si la URL no termina en /menu, asumimos un fallo.
            if (!loginResponse.ok || !loginResponse.url.endsWith('/menu')) {
                //const errorText = await loginResponse.text();
                const errorText = 'Credenciales incorrectas o error al iniciar sesión';
                throw new Error(errorText);
            }

            // Si el login fue exitoso, actualiza el estado de la sesión y carga el contexto del cliente
            setIsLoggedIn(true);

            // --- ¡CAMBIO CLAVE AQUÍ! ---
            // Despacha el thunk de Redux para cargar el clientContext.
            // El .unwrap() es importante para poder capturar errores directamente con try/catch.
            await dispatch(fetchClientContext()).unwrap(); 

            console.log("Login exitoso y clientContext cargado.");
            navigate('/home'); // Redirige al home o dashboard
            reset(); // Limpia el formulario
        } catch (error: any) {
            console.error("Error al iniciar sesión:", error);
            setIsLoggedIn(false); // Marca como no logueado en caso de error
            // setClientContext(null); // No necesitas llamar a setClientContext aquí, Redux lo maneja
            setLoginError(error.message || 'Ocurrió un error al iniciar sesión. Inténtalo de nuevo.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Box
            display="flex"
            alignItems="center"
            justifyContent="center"
            minHeight="100vh"
            bgcolor="#f5f5f5"
        >
            <Box
                width="100%"
                maxWidth="400px"
                padding={4}
                bgcolor="white"
                borderRadius={8}
                boxShadow={3}
            >
                <Typography variant="h5" align="center" gutterBottom>
                    Iniciar Sesión
                </Typography>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                        <label htmlFor="username">
                            <Typography variant="subtitle1" component="div" sx={{ fontWeight: 'medium' }}>
                                Usuario
                            </Typography>
                        </label>
                        <Controller
                            name="username"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    type="text" // Cambiado de "username" a "text" que es más estándar para input type
                                    placeholder="Ingresa tu usuario"
                                    fullWidth
                                    margin="normal"
                                    error={!!errors.username}
                                    helperText={errors.username?.message}
                                    disabled={isSubmitting}
                                />
                            )}
                        />
                    </div>
                    <div>
                        <label htmlFor="password">
                            <Typography variant="subtitle1" component="div" sx={{ fontWeight: 'medium' }}>
                                Contraseña
                            </Typography>
                        </label>
                        <Controller
                            name="password"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    type="password"
                                    placeholder="Ingresa tu contraseña"
                                    fullWidth
                                    margin="normal"
                                    error={!!errors.password}
                                    helperText={errors.password?.message}
                                    disabled={isSubmitting}
                                />
                            )}
                        />
                    </div>
                    <Button type="submit" fullWidth variant="contained" color="primary" disabled={isSubmitting} sx={{ mt: 2 }}>
                        {isSubmitting ? (
                            <>
                                <CircularProgress size={20} sx={{ mr: 1 }} />
                                Iniciando sesión...
                            </>
                        ) : (
                            'Iniciar Sesión'
                        )}
                    </Button>
                </form>
                {loginError && (
                    <Alert severity="error" sx={{ mt: 2, maxHeight:'200px'}}> {/* Ya no necesitas alertProps */}
                        <AlertTitle>Error</AlertTitle>
                        {loginError}
                    </Alert>
                )}
            </Box>
        </Box>
    );
};

export default LoginPage;