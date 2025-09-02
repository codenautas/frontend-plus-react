import * as JSON4all from "json4all";
import { store } from '../store';

export const cambiarGuionesBajosPorEspacios = (texto:string)=>texto.replace(/_/g,' ');
export const quitarGuionesBajos = (texto:string)=>texto.replace(/_/g,'');

export const formatearValor = (valor: any): string => {
    if (valor === null || valor === undefined) {
        return '';
    }
    
    // Si es un objeto Date
    if (valor instanceof Date) {
        return valor.toLocaleDateString("es-ES");
    }
    
    // Si es un objeto especial de fecha con formato {$special: 'date', $value: 'YYYY-MM-DD'}
    if (typeof valor === 'object' && valor.$special === 'date' && valor.$value) {
        const fecha = new Date(valor.$value);
        return fecha.toLocaleDateString("es-ES");
    }
    
    // Si es una fecha en string que puede parsearse como Date (formato ISO o similar)
    if (typeof valor === 'string' && valor.match(/^\d{4}-\d{2}-\d{2}/) && !isNaN(Date.parse(valor))) {
        const fecha = new Date(valor);
        return fecha.toLocaleDateString("es-ES");
    }
    
    // Si es un objeto pero no Date
    if (typeof valor === 'object') {
        // Intentar extraer información útil del objeto
        if (valor.toString && valor.toString() !== '[object Object]') {
            return valor.toString();
        }
        return JSON.stringify(valor);
    }
    
    // Para cualquier otro valor, convertir a string
    return String(valor);
};

const getAppPrefix = () => {
    const state = store.getState();
    const { config } = state.clientContext;
    return /*config.appName+*/'prefijo_'+ config.version+'_';
}

const getRawLocalVar = (varName: string) =>localStorage.getItem(getAppPrefix()+varName);

const getLocalVar = (varName: string) =>{
    let rawData = getRawLocalVar(varName);
    if(rawData){
        return JSON4all.parse(rawData);
    }else{
        return null
    }
}

const setLocalVar = (varName: string, value:any) => localStorage.setItem(getAppPrefix()+varName, JSON4all.stringify(value))


const existsLocalVar = (varName: string) => !!getRawLocalVar(varName);


const removeLocalVar = (varName: string) => localStorage.removeItem(getAppPrefix()+varName);

const getSessionVar = (varName: string) =>{
    if(existsSessionVar(varName)){
        return JSON4all.parse(sessionStorage.getItem(getAppPrefix()+varName)!);
    }else{
        return null
    }
}

const setSessionVar = (varName: string, value:any) => sessionStorage.setItem(getAppPrefix()+varName, JSON4all.stringify(value))


const existsSessionVar = (varName: string) => !!(sessionStorage.getItem(getAppPrefix()+varName))?true:false


const removeSessionVar = (varName: string) => sessionStorage.removeItem(getAppPrefix()+varName);
