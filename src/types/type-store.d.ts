// Tipos de lo que esta librería usa de 'type-store' (el paquete no publica los suyos).
// Está pensado para mudarse tal cual a types.d.ts (modules/type-store/index.d.ts).
declare module 'type-store' {
    /** Cómo describir un campo para pedir su typer: alcanza con un FieldDefinition de backend-plus */
    interface TypeInfo {
        typeName?: string;
        nullable?: boolean;
    }

    /** Un tipo de dato (texto, entero, fecha...): convierte entre el valor tipado y sus representaciones */
    interface Typer {
        typeName: string;
        /** El valor que representa «vacío» para ese tipo */
        emptyValue: unknown;
        toLocalString(valorTipado: unknown): string;
        toPlainString(valorTipado: unknown): string;
        /** De lo que escribe la persona (según su configuración regional) al valor tipado */
        fromLocalString(texto: string): unknown;
        fromUserInput(texto: string): unknown;
        /** Lanza un Error si el valor no sirve para ese tipo */
        validateTypedData(valorTipado: unknown): void;
        /** El valor y el tipo de celda de Excel (b: lógico, n: número, s: texto, d: fecha...) */
        toExcelValue(valorTipado: unknown): string | number | boolean | Date;
        toExcelType(valorTipado: unknown): 'b' | 'n' | 'e' | 's' | 'd' | 'z';
    }

    interface TypeStore {
        typerFrom(typeInfo: TypeInfo): Typer;
        messages: unknown;
        locale: unknown;
        i18n: {
            messages: Record<string, unknown>;
            locale: Record<string, unknown>;
        };
    }

    const typeStore: TypeStore;
    export type { Typer, TypeInfo };
    export default typeStore;
}
