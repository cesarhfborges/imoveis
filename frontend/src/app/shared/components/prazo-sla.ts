import { Component, computed, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { PrazoSla, StatusDenuncia, duracaoMinutos } from '@/app/core/models/models';

type Faixa = 'ok' | 'atencao' | 'alerta' | 'critico' | 'vencido' | 'parado';

/**
 * Prazo (SLA) do anunciante para uma denúncia: barra horizontal com a porcentagem do prazo que ainda resta,
 * colorida pela urgência (verde > 50%, amarelo > 25%, laranja > 10%, vermelho abaixo disso ou vencido; cinza
 * quando parado aguardando a moderação), e o texto com quanto falta, até quando e se a contagem está pausada.
 */
@Component({
    selector: 'app-prazo-sla',
    imports: [DatePipe],
    template: `
        @if (visivel()) {
            <div class="sla" [class]="'sla--' + faixa()" [class.sla--compacto]="compacto()">
                <div class="sla__topo">
                    <strong class="sla__titulo">
                        @switch (estado()) {
                            @case ('vencido') {
                                Prazo vencido
                            }
                            @case ('analise') {
                                Prazo parado
                            }
                            @default {
                                Faltam {{ restante() }} úteis
                            }
                        }
                    </strong>
                    <span class="sla__pct">{{ porcentagem() }}%</span>
                </div>
                <div class="sla__barra" role="progressbar" [attr.aria-valuenow]="porcentagem()" aria-valuemin="0" aria-valuemax="100" [attr.aria-label]="rotulo()">
                    <span class="sla__valor" [style.width.%]="porcentagem()"></span>
                </div>
                <span class="sla__detalhe">
                    @switch (estado()) {
                        @case ('vencido') {
                            @if (prazo().prazoEm) {
                                venceu em {{ prazo().prazoEm | date: "dd/MM 'às' HH:mm" }}
                            }
                        }
                        @case ('correndo') {
                            até {{ prazo().prazoEm | date: "dd/MM 'às' HH:mm" }}
                        }
                        @case ('pausado') {
                            pausado fora do expediente até {{ prazo().retomaEm | date: "EEE dd/MM 'às' HH:mm" }}
                        }
                        @case ('analise') {
                            aguardando a moderação{{ prazo().minutosNaPausa != null ? ' · restavam ' + restanteNaPausa() + ' úteis' : '' }}
                        }
                    }
                </span>
            </div>
        }
    `,
    styles: `
        :host {
            display: block;
            width: 17rem;
            max-width: 100%;
        }
        .sla {
            --sla-cor: var(--p-green-600);
            display: flex;
            flex-direction: column;
            gap: 0.3rem;
        }
        .sla--ok {
            --sla-cor: var(--p-green-600);
        }
        .sla--atencao {
            --sla-cor: var(--p-yellow-500);
        }
        .sla--alerta {
            --sla-cor: var(--p-orange-500);
        }
        .sla--critico,
        .sla--vencido {
            --sla-cor: var(--p-red-600);
        }
        .sla--parado {
            --sla-cor: var(--p-surface-400);
        }
        .sla__topo {
            display: flex;
            align-items: baseline;
            justify-content: space-between;
            gap: 0.75rem;
        }
        .sla__titulo {
            font-size: 0.88rem;
            color: var(--p-text-color);
        }
        .sla__pct {
            font-size: 0.85rem;
            font-weight: 700;
            font-variant-numeric: tabular-nums;
            color: var(--p-text-color);
        }
        .sla__barra {
            height: 8px;
            border-radius: 999px;
            background: var(--p-content-border-color);
            overflow: hidden;
        }
        .sla__valor {
            display: block;
            height: 100%;
            border-radius: 999px;
            background: var(--sla-cor);
            transition: width 0.6s ease;
        }
        .sla__detalhe {
            font-size: 0.78rem;
            color: var(--p-text-muted-color);
        }
        .sla--compacto .sla__barra {
            height: 6px;
        }
        .sla--critico .sla__titulo,
        .sla--vencido .sla__titulo,
        .sla--critico .sla__pct,
        .sla--vencido .sla__pct {
            color: var(--p-red-700);
        }
        :host-context(.app-dark) .sla--critico .sla__titulo,
        :host-context(.app-dark) .sla--vencido .sla__titulo,
        :host-context(.app-dark) .sla--critico .sla__pct,
        :host-context(.app-dark) .sla--vencido .sla__pct {
            color: var(--p-red-400);
        }
        @media (prefers-reduced-motion: reduce) {
            .sla__valor {
                transition: none;
            }
        }
    `
})
export class PrazoSlaComponent {
    prazo = input.required<PrazoSla>();
    status = input<StatusDenuncia>('AGUARDANDO_ANUNCIANTE');
    /** Versão menor (listas). */
    compacto = input(false);

    estado = computed<'vencido' | 'correndo' | 'pausado' | 'analise' | 'nenhum'>(() => {
        const p = this.prazo();
        if (this.status() === 'EM_ANALISE') return 'analise';
        if (this.status() !== 'AGUARDANDO_ANUNCIANTE') return 'nenhum';
        if (p.vencido) return 'vencido';
        if (!p.prazoEm) return 'nenhum';
        return p.correndoAgora ? 'correndo' : 'pausado';
    });

    visivel = computed(() => this.estado() !== 'nenhum');

    /** Porcentagem do prazo que ainda resta (0 a 100). */
    porcentagem = computed(() => {
        const p = this.prazo();
        if (this.estado() === 'vencido') return 0;
        const resta = this.estado() === 'analise' ? p.minutosNaPausa : p.minutosRestantes;
        if (!p.slaMinutos || resta == null) return this.estado() === 'analise' ? 100 : 0;
        return Math.max(0, Math.min(100, Math.round((resta / p.slaMinutos) * 100)));
    });

    faixa = computed<Faixa>(() => {
        if (this.estado() === 'vencido') return 'vencido';
        if (this.estado() === 'analise') return 'parado';
        const pct = this.porcentagem();
        return pct > 50 ? 'ok' : pct > 25 ? 'atencao' : pct > 10 ? 'alerta' : 'critico';
    });

    restante = computed(() => duracaoMinutos(this.prazo().minutosRestantes));
    restanteNaPausa = computed(() => duracaoMinutos(this.prazo().minutosNaPausa));

    rotulo = computed(() => {
        if (this.estado() === 'vencido') return 'Prazo vencido: 0% restante';
        if (this.estado() === 'analise') return `Prazo parado com ${this.porcentagem()}% restante`;
        return `${this.porcentagem()}% do prazo restante`;
    });
}
