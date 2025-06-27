// src/hooks/useLogout.ts
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

// Importa los hooks de Redux y la acción clearClientContext
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../store'; // Asegúrate de que la ruta sea correcta
import { clearClientContext } from '../store/clientContextSlice'; // Importa la acción para limpiar el contexto

import { useApp } from '../contexts/AppContext'; // Para acceder a setIsLoggedIn
import { fetchApi } from '../utils/fetchApi'; // Para la llamada a la API

/**
 * Hook personalizado para manejar la lógica de cierre de sesión.
 * Limpia el estado del frontend y realiza la petición al backend.
 * @returns Una función 'logout' que, al ser llamada, cierra la sesión.
 */
const useLogout = () => {
    // Obtenemos las funciones del contexto de la aplicación
    const { setIsLoggedIn } = useApp(); // setClientContext ya no viene de useApp()

    // Obtenemos el dispatch de Redux
    const dispatch = useDispatch<AppDispatch>();

    // Obtenemos la función de navegación de React Router
    const navigate = useNavigate();

    // Utilizamos useCallback para memoizar la función 'logout'
    const logout = useCallback(async () => {
        try {
            const response = await fetchApi('/logout', { method: 'GET' }); // Asumiendo que tienes un endpoint /logout
            
            // Puedes ajustar esta lógica de verificación de respuesta
            // Si el backend siempre devuelve 401 para un logout exitoso (lo cual es inusual,
            // normalmente es un 200 OK y luego el backend invalida la sesión),
            // entonces tu lógica actual es válida.
            if (response.status === 401 || response.ok) { // Considera response.ok también si el backend da 200
                console.log('Sesión cerrada correctamente o ya deslogueado');
            } else {
                console.error('Error al cerrar sesión:', await response.text());
                // Si el logout falla en el backend, podrías decidir no limpiar el estado local
                // o mostrar un error al usuario. Por ahora, lo limpiamos igual.
            }
        } catch (error) {
            console.error('Error de red al intentar cerrar sesión:', error);
        } finally {
            // Siempre limpiamos el estado de login en el frontend,
            // independientemente del éxito o fracaso de la petición al backend.
            setIsLoggedIn(false); // Actualiza el estado de login en el contexto
            
            // --- ¡CAMBIO CLAVE AQUÍ! ---
            // Despacha la acción de Redux para limpiar el clientContext
            dispatch(clearClientContext()); 

            navigate('/login', { replace: true }); // Redirige a /login
        }
    }, [setIsLoggedIn, dispatch, navigate]); // Dependencias: setIsLoggedIn, dispatch (estable), navigate (estable)

    return logout; // Devolvemos la función 'logout'
};

export default useLogout;