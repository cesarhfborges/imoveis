import { Financeira } from '@/app/core/models/models';

/** Cálculo da simulação de financiamento (estimativa; não substitui a análise de crédito do banco). */

export type Sistema = 'SAC' | 'PRICE';

export interface ParametrosSimulacao {
    preco: number;
    entrada: number;
    prazo: number;
    sistema: Sistema;
    /** Renda bruta mensal (opcional): mostra o comprometimento. */
    renda: number | null;
    /** Idade do comprador (opcional): limita o prazo pela idade máxima de quitação. */
    idade: number | null;
}

export interface ResultadoSimulacao {
    valorFinanciado: number;
    taxaMensal: number;
    primeiraParcela: number;
    ultimaParcela: number;
    totalPago: number;
    totalJuros: number;
    totalEncargos: number;
    custoTotal: number;
    rendaMinima: number;
    /** % da renda informada comprometida pela 1ª parcela (null sem renda). */
    comprometimento: number | null;
    /** Saldo devedor e parcela no início de cada ano do contrato (para o gráfico). */
    evolucao: { ano: number; parcela: number; saldo: number }[];
}

export function sistemasDa(f: Financeira): Sistema[] {
    return f.sistemaAmortizacao === 'AMBOS' ? ['SAC', 'PRICE'] : [f.sistemaAmortizacao];
}

/** Juros efetivos ao ano (%) convertidos para taxa mensal (fração). */
export function taxaMensal(f: Financeira): number {
    return Math.pow(1 + f.taxaJurosAnual / 100, 1 / 12) - 1;
}

export function entradaMinima(f: Financeira, preco: number): number {
    return Math.ceil((preco * f.entradaMinimaPercentual) / 100);
}

/** Prazo máximo em meses, limitado pela idade máxima de quitação quando a idade é informada. */
export function prazoMaximo(f: Financeira, idade: number | null): number {
    if (!idade || !f.idadeMaximaQuitacao) return f.prazoMaximoMeses;
    return Math.max(0, Math.min(f.prazoMaximoMeses, (f.idadeMaximaQuitacao - idade) * 12));
}

/** Motivo de o imóvel não se enquadrar na financeira (null = enquadra). */
export function motivoInelegivel(f: Financeira, preco: number): string | null {
    if (f.valorMinimoImovel != null && preco < f.valorMinimoImovel) return 'Imóvel abaixo do valor mínimo aceito por esta financeira.';
    if (f.valorMaximoImovel != null && preco > f.valorMaximoImovel) return 'Imóvel acima do valor máximo aceito por esta financeira.';
    return null;
}

/** Problemas nos parâmetros informados (lista vazia = pode simular). */
export function validar(f: Financeira, p: ParametrosSimulacao): string[] {
    const erros: string[] = [];
    const motivo = motivoInelegivel(f, p.preco);
    if (motivo) erros.push(motivo);
    if (p.entrada < entradaMinima(f, p.preco)) erros.push(`A entrada mínima é de ${f.entradaMinimaPercentual}% do valor do imóvel.`);
    if (p.entrada >= p.preco) erros.push('A entrada precisa ser menor que o valor do imóvel.');
    const max = prazoMaximo(f, p.idade);
    if (max < 12) erros.push('Pela idade informada, o prazo disponível nesta financeira é menor que 1 ano.');
    else if (p.prazo < 12 || p.prazo > max) erros.push(`O prazo deve ficar entre 12 e ${max} meses.`);
    if (!sistemasDa(f).includes(p.sistema)) erros.push('Sistema de amortização não oferecido por esta financeira.');
    return erros;
}

export function simular(f: Financeira, p: ParametrosSimulacao): ResultadoSimulacao {
    const pv = Math.max(p.preco - p.entrada, 0);
    const n = Math.max(Math.round(p.prazo), 1);
    const i = taxaMensal(f);
    const seguro = f.seguroMensalPercentual / 100;
    const adm = f.taxaAdministracaoMensal;
    const pricePmt = i === 0 ? pv / n : (pv * i) / (1 - Math.pow(1 + i, -n));

    let saldo = pv;
    let totalPago = 0;
    let totalJuros = 0;
    let totalEncargos = 0;
    let primeira = 0;
    let ultima = 0;
    const evolucao: ResultadoSimulacao['evolucao'] = [];
    for (let m = 1; m <= n; m++) {
        const juros = saldo * i;
        const amortizacao = p.sistema === 'SAC' ? pv / n : pricePmt - juros;
        const encargos = saldo * seguro + adm;
        const parcela = amortizacao + juros + encargos;
        if (m === 1) primeira = parcela;
        if ((m - 1) % 12 === 0) evolucao.push({ ano: (m - 1) / 12 + 1, parcela, saldo });
        totalPago += parcela;
        totalJuros += juros;
        totalEncargos += encargos;
        saldo = Math.max(saldo - amortizacao, 0);
        ultima = parcela;
    }
    return {
        valorFinanciado: pv,
        taxaMensal: i,
        primeiraParcela: primeira,
        ultimaParcela: ultima,
        totalPago,
        totalJuros,
        totalEncargos,
        custoTotal: totalPago + p.entrada,
        rendaMinima: primeira / (f.comprometimentoRendaPercentual / 100),
        comprometimento: p.renda ? (primeira / p.renda) * 100 : null,
        evolucao
    };
}

/** Parâmetros sugeridos: entrada mínima, prazo máximo e o sistema de parcela inicial mais baixa (Price). */
export function parametrosPadrao(f: Financeira, preco: number): ParametrosSimulacao {
    const sistemas = sistemasDa(f);
    return { preco, entrada: entradaMinima(f, preco), prazo: f.prazoMaximoMeses, sistema: sistemas.includes('PRICE') ? 'PRICE' : 'SAC', renda: null, idade: null };
}

/** Primeira parcela estimada com os parâmetros sugeridos (para comparar financeiras). */
export function parcelaEstimada(f: Financeira, preco: number): number {
    return simular(f, parametrosPadrao(f, preco)).primeiraParcela;
}
