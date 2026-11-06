import { describe, expect, it } from 'vitest';
import { acotarEstilos } from './estilosBP';

// los espacios entre reglas no importan: queda uno solo después de cada ; y }, y antes de cada {
const normal = (css: string): string => css.replace(/\s*([;}{])\s*/g, (_, c: string) => c === '{' ? ' {' : c + ' ').trim();
const acotar = (css: string): string => normal(acotarEstilos(css, 'http://servidor/app/css/hoja.css'));

describe('estilos de backend-plus acotados al contenedor', () => {
    it('las reglas de body, html y :root pasan a ser las del contenedor (no tocan el resto de la aplicación)', () => {
        expect(acotar('body{font-family:arial}')).toBe(normal(':where(.fpr-bp) {font-family:arial}'));
        expect(acotar('html{margin:0} :root{--a:1}')).toBe(normal(':where(.fpr-bp) {margin:0} :where(.fpr-bp) {--a:1}'));
        expect(acotar('body.dark a{color:red}')).toBe(normal(':where(.fpr-bp).dark a {color:red}'));
        expect(acotar('html body{x:1}')).toBe(normal(':where(.fpr-bp) {x:1}'));
    });

    it('cualquier otro selector queda dentro del contenedor, también en cada elemento de una lista', () => {
        expect(acotar('a.disabled, #mini-console:empty{display:none}')).toBe(normal(':where(.fpr-bp) a.disabled, :where(.fpr-bp) #mini-console:empty {display:none}'));
        expect(acotar('td:not(.a,.b){x:1}')).toBe(normal(':where(.fpr-bp) td:not(.a,.b) {x:1}'));
        expect(acotar('input[value="a,b"]{x:1}')).toBe(normal(':where(.fpr-bp) input[value="a,b"] {x:1}'));
    });

    it('entra en @media y deja como están @font-face y @keyframes', () => {
        expect(acotar('@media (max-width:600px){body{font-size:2px} td{x:1}}')).toBe(normal('@media (max-width:600px) {:where(.fpr-bp) {font-size:2px} :where(.fpr-bp) td {x:1}}'));
        expect(acotar('@font-face{font-family:f;src:url(f.woff)} @keyframes a{from{x:1}to{x:2}}'))
            .toBe(normal('@font-face{font-family:f;src:url(http://servidor/app/css/f.woff)} @keyframes a{from{x:1}to{x:2}}'));
    });

    it('las url relativas se resuelven contra la hoja, y los comentarios y las llaves en textos no molestan', () => {
        expect(acotar('/* body{x:1} */ #a{background:url("../img/a.png")} .b::after{content:"}"} .c{x:1}'))
            .toBe(normal(':where(.fpr-bp) #a {background:url("http://servidor/app/img/a.png")} :where(.fpr-bp) .b::after {content:"}"} :where(.fpr-bp) .c {x:1}'));
    });

    it('las reglas de un skin ([my-skin=...] body, [my-skin=...] td) se aplican al contenedor que lleva ese atributo', () => {
        expect(acotar('[my-skin=default] body{font-family:arial} [my-skin=default] td{x:1} [my-skin=default]{y:1}'))
            .toBe(normal(':where(.fpr-bp)[my-skin=default] {font-family:arial} :where(.fpr-bp)[my-skin=default] td {x:1} :where(.fpr-bp)[my-skin=default] {y:1}'));
    });

    it('al contenedor no se le da el alto ni el scroll del documento (cortaría el contenido y la grilla no scrollearía)', () => {
        expect(acotar('html,body{height:100%;overflow:hidden;margin:0;background:url(data:image/png;base64,AA)}'))
            .toBe(normal(':where(.fpr-bp), :where(.fpr-bp) {margin:0;background:url(data:image/png;base64,AA)}'));
        expect(acotar('body, td{overflow:auto;color:red}')).toBe(normal(':where(.fpr-bp) {color:red} :where(.fpr-bp) td {overflow:auto;color:red}'));
        expect(acotar('.my-grid{overflow:auto;height:10px}')).toBe(normal(':where(.fpr-bp) .my-grid {overflow:auto;height:10px}'));
    });

    it('los diálogos de backend-plus (cuelgan del body, fuera del contenedor) no se acotan', () => {
        expect(acotar('.dialog-promise button{margin:10px} div.dialog-export[current-state="ready"]{x:1} [key-selected] td{y:1} .dialog-promise-x, td{z:1}'))
            .toBe(normal('.dialog-promise button {margin:10px} div.dialog-export[current-state="ready"] {x:1} [key-selected] td {y:1} .dialog-promise-x, :where(.fpr-bp) td {z:1}'));
    });

    it('un @import sin bloque queda como está', () => {
        expect(acotar('@charset "utf-8"; body{x:1}')).toBe(normal('@charset "utf-8"; :where(.fpr-bp) {x:1}'));
    });
});
