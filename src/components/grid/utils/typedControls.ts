// src/components/grid/utils/typedControls.ts

export const BestControls = {
    text: {
        translates: {
            true: { '\n': '\u21b5' },
            false: { '\u21b5': '\n' }
        },
        translate: (right: boolean, textValue: string): string => {
            const map = BestControls.text.translates[right ? 'true' : 'false'] as Record<string, string>;
            let result = textValue;
            for (const char in map) {
                result = result.replace(new RegExp(char, 'g'), map[char]);
            }
            return result;
        },
        getTypedValue: (plainValue: any, typer: any): any => {
            if (plainValue === null || plainValue === undefined) {
                return plainValue;
            }
            return typer.fromUserInput(plainValue);
        }
    },
    number: {
        getTypedValue: (plainValue: any): any => {
            // En React, plainValue suele ser el string del input
            if (plainValue === '' || plainValue === null || plainValue === undefined) {
                return null;
            }
            const num = Number(plainValue);
            return isNaN(num) ? null : num;
        }
    },
    boolean: {
        getTypedValue: (plainValue: any): any => {
            if (typeof plainValue === 'boolean') return plainValue;
            if (plainValue === null || plainValue === undefined) return null;

            const value = String(plainValue).trim();
            const falseInitials: Record<string, boolean> = {
                'n': true, 'N': true, '0': true, '2': true, 'F': true, 'f': true,
                '\u043d': true, '\u041d': true // cyrillic N
            };

            if (value === '') return null;
            return !falseInitials[value[0]];
        }
    },
    date: {
        getTypedValue: (plainValue: any, typer?: any): any => {
            if (plainValue === null || plainValue === undefined || plainValue === '') return null;
            if (plainValue instanceof Date) return plainValue;

            const parts = String(plainValue).trim().split(/[-\/]/).map(s => s.trim());
            if (parts.length !== 3) return null;

            let day: number, month: number, year: number;

            // Detectar si es YYYY-MM-DD o DD/MM/YYYY
            if (parts[0].length === 4) {
                // YYYY-MM-DD
                year = Number(parts[0]);
                month = Number(parts[1]) - 1;
                day = Number(parts[2]);
            } else {
                // DD/MM/YYYY
                // Requisito: Años si o si con 4 dígitos
                if (parts[2].length !== 4) return null;

                day = Number(parts[0]);
                month = Number(parts[1]) - 1;
                year = Number(parts[2]);
            }

            const date = new Date(year, month, day);
            // Validar que sea una fecha real (ej: no 31/02/2024)
            if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
                (date as any).isRealDate = true;
                return date;
            }
            return null;
        }
    }
};

/**
 * Función principal para obtener el valor tipado según el tipo del typer.
 */
export const getBestTypedValue = (value: any, typer: any): any => {

    value = value === '' ? typer.emptyValue : value;

    const typeName = typer.typeName;

    if (['integer', 'bigint', 'decimal', 'double', 'float', 'number'].includes(typeName)) {
        return BestControls.number.getTypedValue(value);
    }
    if (typeName === 'boolean') {
        return BestControls.boolean.getTypedValue(value);
    }
    if (typeName === 'date' || (typeName && typeName.toLowerCase().includes('timestamp'))) {
        return BestControls.date.getTypedValue(value, typer);
    }

    return BestControls.text.getTypedValue(value, typer);
};
