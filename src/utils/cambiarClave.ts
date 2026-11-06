// Cambio de contraseña: el servidor (login-plus, POST /chpass) contesta con una redirección: al login si cambió la clave
// (y cierra la sesión) o de vuelta a /chpass con el motivo en la página si no pudo.
export type ResultadoDeCambioDeClave = { ok: true } | { ok: false, mensaje: string };

const MENSAJE_POR_OMISION = 'No se pudo cambiar la contraseña';

export function resultadoDeCambioDeClave(urlFinal: string, html: string): ResultadoDeCambioDeClave {
    if (/\/login\/?(\?.*)?$/.test(urlFinal)) return { ok: true };
    // chpass.jade deja cada error en una fila `.error-message`
    const mensajes = Array.from(new DOMParser().parseFromString(html, 'text/html').querySelectorAll('.error-message'))
        .map(elemento => (elemento.textContent ?? '').trim())
        .filter(mensaje => mensaje !== '');
    return { ok: false, mensaje: mensajes.join('\n') || MENSAJE_POR_OMISION };
}
