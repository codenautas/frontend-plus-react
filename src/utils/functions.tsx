import * as JSON4all from "json4all";
import { store } from '../store';

export const cambiarGuionesBajosPorEspacios = (texto:string)=>texto.replace(/_/g,' ');
export const quitarGuionesBajos = (texto:string)=>texto.replace(/_/g,'');

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
