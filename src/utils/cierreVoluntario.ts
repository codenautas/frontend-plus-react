// Salir o cambiar la contraseña cierran la sesión a propósito: no es una sesión que expiró y la pantalla donde se estaba no
// se recuerda para volver a ella (eso es solo para quien llega por un enlace sin sesión o a quien se le venció la cookie).
// Dura hasta volver a iniciar sesión y no se guarda: al recargar la página, el enlace que se abra sí se recuerda.
let cierreVoluntario = false;

export const marcarCierreVoluntario = (activo: boolean): void => {
    cierreVoluntario = activo;
};

export const huboCierreVoluntario = (): boolean => cierreVoluntario;
