import { describe, expect, it } from 'vitest';
import { resultadoDeCambioDeClave } from './cambiarClave';

describe('resultado del cambio de contraseña', () => {
    it('si el servidor lleva al login, la clave cambió', () => {
        expect(resultadoDeCambioDeClave('http://localhost/dmencu/login', '<html></html>')).toEqual({ ok: true });
    });

    it('si vuelve a chpass, el mensaje es el que el servidor deja en la página', () => {
        const html = '<table><tr style="color:red"><td class="error-message" colspan="5"> La clave nueva no coincide </td></tr></table>';
        expect(resultadoDeCambioDeClave('http://localhost/dmencu/chpass', html)).toEqual({ ok: false, mensaje: 'La clave nueva no coincide' });
    });

    it('sin mensaje en la página, avisa igual que no se pudo', () => {
        expect(resultadoDeCambioDeClave('http://localhost/dmencu/chpass', '<html></html>')).toEqual({ ok: false, mensaje: 'No se pudo cambiar la contraseña' });
    });
});
