// El puente con backend-plus es opcional: la aplicación lo enciende (prop `puenteBP` de `App`) y recién entonces las
// wScreens que no están en `myWScreens` se piden al cliente de backend-plus en lugar de mostrar «no implementada».
let habilitado = false;

export const habilitarPuenteBP = (): void => {
    habilitado = true;
};

export const puenteBPHabilitado = (): boolean => habilitado;
