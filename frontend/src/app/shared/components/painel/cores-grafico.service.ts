import { Injectable, effect, inject, signal } from '@angular/core';
import { ThemeService } from '@/app/core/services/theme.service';
import { LayoutService } from '@/app/layout/service/layout.service';

/** Cores dos gráficos lidas dos tokens do tema (mudam com a cor primária, o preset e o modo escuro). */
export interface CoresGrafico {
    primaria: string;
    texto: string;
    textoSuave: string;
    borda: string;
    /** Paleta categórica: primária primeiro, depois tons distintos do tema. */
    serie: string[];
}

const SERIE = ['cyan', 'orange', 'emerald', 'purple', 'pink', 'amber', 'indigo', 'teal', 'slate'];
const RESERVA: Record<string, string> = {
    cyan: '#06b6d4',
    orange: '#f97316',
    emerald: '#10b981',
    purple: '#a855f7',
    pink: '#ec4899',
    amber: '#f59e0b',
    indigo: '#6366f1',
    teal: '#14b8a6',
    slate: '#64748b'
};

@Injectable({ providedIn: 'root' })
export class CoresGraficoService {
    private tema = inject(ThemeService);
    private layout = inject(LayoutService);

    readonly cores = signal<CoresGrafico>(ler());

    constructor() {
        effect(() => {
            // relê os tokens sempre que o tema mudar; o PrimeNG aplica as variáveis CSS logo em seguida
            this.tema.choice();
            this.layout.layoutConfig();
            if (typeof requestAnimationFrame !== 'undefined') requestAnimationFrame(() => this.cores.set(ler()));
        });
    }

    /** Cor com transparência (para áreas de gráfico de linha). */
    static translucida(cor: string, alfa = 0.15): string {
        const hex = cor.replace('#', '');
        const cheio = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex;
        if (!/^[0-9a-f]{6}$/i.test(cheio)) return cor;
        const n = parseInt(cheio, 16);
        return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alfa})`;
    }
}

function ler(): CoresGrafico {
    if (typeof document === 'undefined') {
        return { primaria: '#1c3c6d', texto: '#334155', textoSuave: '#64748b', borda: '#e2e8f0', serie: ['#1c3c6d', ...SERIE.map((c) => RESERVA[c])] };
    }
    const css = getComputedStyle(document.documentElement);
    const v = (nome: string, reserva: string) => css.getPropertyValue(nome).trim() || reserva;
    const primaria = v('--p-primary-color', '#1c3c6d');
    return {
        primaria,
        texto: v('--p-text-color', '#334155'),
        textoSuave: v('--p-text-muted-color', '#64748b'),
        borda: v('--p-content-border-color', '#e2e8f0'),
        serie: [primaria, ...SERIE.map((c) => v(`--p-${c}-500`, RESERVA[c]))]
    };
}
