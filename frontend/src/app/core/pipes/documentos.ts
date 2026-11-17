import { digitos } from './formatos';

/** CPF válido: 11 dígitos, não todos iguais, e os dois dígitos verificadores conferem. */
export function cpfValido(valor: string | null | undefined): boolean {
    const d = digitos(valor);
    if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
    const dv = (base: string, pesoInicial: number) => {
        const soma = [...base].reduce((s, c, i) => s + Number(c) * (pesoInicial - i), 0);
        const resto = (soma * 10) % 11;
        return resto === 10 ? 0 : resto;
    };
    return dv(d.slice(0, 9), 10) === Number(d[9]) && dv(d.slice(0, 10), 11) === Number(d[10]);
}

/** CNPJ válido: 14 dígitos, não todos iguais, e os dois dígitos verificadores conferem. */
export function cnpjValido(valor: string | null | undefined): boolean {
    const d = digitos(valor);
    if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
    const dv = (base: string) => {
        const pesos = base.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
        const soma = [...base].reduce((s, c, i) => s + Number(c) * pesos[i], 0);
        const resto = soma % 11;
        return resto < 2 ? 0 : 11 - resto;
    };
    return dv(d.slice(0, 12)) === Number(d[12]) && dv(d.slice(0, 13)) === Number(d[13]);
}

/** CPF para corretor, CNPJ para imobiliária. */
export function documentoValido(valor: string | null | undefined, imobiliaria: boolean): boolean {
    return imobiliaria ? cnpjValido(valor) : cpfValido(valor);
}

/** Mensagem de erro do campo CPF/CNPJ (erros `required`, `incompleto` e `documento`). */
export function erroDocumento(erros: Record<string, unknown> | null, imobiliaria: boolean): string | null {
    const nome = imobiliaria ? 'CNPJ' : 'CPF';
    if (!erros) return null;
    if (erros['required']) return `Informe o ${nome}.`;
    if (erros['incompleto']) return `${nome} incompleto.`;
    if (erros['documento']) return `${nome} inválido. Confira os números.`;
    return null;
}
