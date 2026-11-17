import { CoresGrafico, CoresGraficoService } from './cores-grafico.service';
import { FatiaPainel, PontoDia } from '@/app/core/models/models';

/** Montadores de dados/opções do Chart.js usados pelos painéis (corretor e administração). */

const fmtDia = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' });
const fmtNumero = new Intl.NumberFormat('pt-BR');

export function rotuloDia(dia: string): string {
    const [a, m, d] = dia.split('-').map(Number);
    return fmtDia.format(new Date(a, m - 1, d));
}

export function numero(n: number): string {
    return fmtNumero.format(n);
}

/** Variação percentual inteira; null quando não há base de comparação. */
export function variacao(atual: number, anterior: number): number | null {
    if (!anterior) return null;
    return Math.round(((atual - anterior) / anterior) * 100);
}

export function totalSerie(s: PontoDia[]): number {
    return s.reduce((t, p) => t + p.total, 0);
}

function eixos(c: CoresGrafico, horizontal = false) {
    const grade = { color: c.borda, drawTicks: false };
    const valor = { beginAtZero: true, ticks: { color: c.textoSuave, precision: 0 }, grid: grade, border: { display: false } };
    const categoria = { ticks: { color: c.textoSuave, autoSkip: true, maxRotation: 0 }, grid: { display: false }, border: { display: false } };
    return horizontal ? { x: valor, y: categoria } : { x: categoria, y: valor };
}

export function opcoesLinha(c: CoresGrafico) {
    return {
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { position: 'bottom', labels: { color: c.texto, usePointStyle: true } } },
        scales: eixos(c)
    };
}

export function opcoesBarra(c: CoresGrafico, horizontal = false, legenda = false) {
    return {
        maintainAspectRatio: false,
        indexAxis: horizontal ? 'y' : 'x',
        plugins: { legend: { display: legenda, position: 'bottom', labels: { color: c.texto, usePointStyle: true } } },
        scales: eixos(c, horizontal)
    };
}

export function opcoesPizza(c: CoresGrafico) {
    return {
        maintainAspectRatio: false,
        cutout: '60%',
        plugins: { legend: { position: 'bottom', labels: { color: c.texto, usePointStyle: true } } }
    };
}

/** Séries diárias como linhas (a primeira com área preenchida). */
export function dadosLinha(c: CoresGrafico, series: { rotulo: string; pontos: PontoDia[] }[]) {
    return {
        labels: (series[0]?.pontos ?? []).map((p) => rotuloDia(p.dia)),
        datasets: series.map((s, i) => {
            const cor = c.serie[i % c.serie.length];
            return {
                label: s.rotulo,
                data: s.pontos.map((p) => p.total),
                borderColor: cor,
                backgroundColor: i === 0 ? CoresGraficoService.translucida(cor) : cor,
                fill: i === 0,
                tension: 0.35,
                pointRadius: s.pontos.length > 31 ? 0 : 2,
                borderWidth: 2
            };
        })
    };
}

/** Séries diárias como barras agrupadas. */
export function dadosBarrasDia(c: CoresGrafico, series: { rotulo: string; pontos: PontoDia[] }[]) {
    return {
        labels: (series[0]?.pontos ?? []).map((p) => rotuloDia(p.dia)),
        datasets: series.map((s, i) => ({ label: s.rotulo, data: s.pontos.map((p) => p.total), backgroundColor: c.serie[i % c.serie.length], borderRadius: 4, maxBarThickness: 18 }))
    };
}

/** Distribuição em barras de uma cor só (ranking). */
export function dadosRanking(c: CoresGrafico, fatias: FatiaPainel[], rotulo: string, cor = c.primaria) {
    return {
        labels: fatias.map((f) => f.rotulo),
        datasets: [{ label: rotulo, data: fatias.map((f) => f.total), backgroundColor: cor, borderRadius: 6, maxBarThickness: 22 }]
    };
}

/** Distribuição em pizza/rosca com a paleta categórica. */
export function dadosPizza(c: CoresGrafico, fatias: FatiaPainel[]) {
    return {
        labels: fatias.map((f) => f.rotulo),
        datasets: [{ data: fatias.map((f) => f.total), backgroundColor: fatias.map((_, i) => c.serie[i % c.serie.length]), borderWidth: 0 }]
    };
}

export function semDados(fatias: FatiaPainel[] | PontoDia[]): boolean {
    return !fatias.some((f) => f.total > 0);
}
