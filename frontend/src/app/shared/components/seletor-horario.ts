import { Component, computed, effect, inject, input, model, signal, untracked } from '@angular/core';
import { SkeletonModule } from 'primeng/skeleton';
import { DiaHorarios } from '@/app/core/models/models';
import { VisitaService } from '@/app/core/services/visita.service';
import { mensagemErro } from '@/app/core/services/api.service';

const fmtDiaSemana = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' });
const fmtDia = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' });
const fmtHora = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });

/** Escolha de dia e horário livres para visitar um imóvel (expediente do site, blocos de 1 h). */
@Component({
    selector: 'app-seletor-horario',
    imports: [SkeletonModule],
    template: `
        @if (carregando()) {
            <div class="flex gap-2 overflow-hidden">
                @for (i of [1, 2, 3, 4, 5]; track i) {
                    <p-skeleton width="4.5rem" height="4rem" />
                }
            </div>
        } @else if (erro()) {
            <p class="text-sm text-red-600 dark:text-red-400 m-0">{{ erro() }}</p>
        } @else if (!dias().length) {
            <p class="text-sm text-muted-color m-0">Não há horários livres nos próximos dias. Fale com o anunciante pelo formulário de contato.</p>
        } @else {
            <div class="flex flex-col gap-4">
                <div role="radiogroup" [attr.aria-labelledby]="rotuloId() + '-dias'" class="flex flex-col gap-2">
                    <span [id]="rotuloId() + '-dias'" class="text-sm font-medium">Dia</span>
                    <div class="flex gap-2 overflow-x-auto pb-1">
                        @for (d of dias(); track d.dia) {
                            <button type="button" role="radio" class="seletor__dia" [class.seletor__dia--ativo]="d.dia === diaEscolhido()" [attr.aria-checked]="d.dia === diaEscolhido()" (click)="escolherDia(d.dia)">
                                <span class="text-xs uppercase">{{ semana(d.dia) }}</span>
                                <span class="font-semibold">{{ dataCurta(d.dia) }}</span>
                            </button>
                        }
                    </div>
                </div>
                <div role="radiogroup" [attr.aria-labelledby]="rotuloId() + '-horas'" class="flex flex-col gap-2">
                    <span [id]="rotuloId() + '-horas'" class="text-sm font-medium">Horário</span>
                    <div class="grid grid-cols-4 sm:grid-cols-6 gap-2">
                        @for (h of horariosDoDia(); track h) {
                            <button type="button" role="radio" class="seletor__hora" [class.seletor__hora--ativo]="h === selecionado()" [attr.aria-checked]="h === selecionado()" (click)="selecionado.set(h)">{{ hora(h) }}</button>
                        }
                    </div>
                </div>
            </div>
        }
    `,
    styles: `
        .seletor__dia,
        .seletor__hora {
            border: 1px solid var(--p-content-border-color);
            background: var(--p-content-background);
            color: var(--p-text-color);
            border-radius: var(--p-border-radius-md, 0.5rem);
            font: inherit;
            cursor: pointer;
            transition:
                border-color 0.15s,
                background-color 0.15s;
        }
        .seletor__dia {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.15rem;
            min-width: 4.5rem;
            padding: 0.5rem 0.75rem;
        }
        .seletor__hora {
            padding: 0.45rem 0;
            font-size: 0.875rem;
        }
        .seletor__dia:hover,
        .seletor__hora:hover {
            border-color: var(--p-primary-color);
        }
        .seletor__dia:focus-visible,
        .seletor__hora:focus-visible {
            outline: 2px solid var(--p-primary-color);
            outline-offset: 2px;
        }
        .seletor__dia--ativo,
        .seletor__hora--ativo {
            border-color: var(--p-primary-color);
            background: var(--p-primary-color);
            color: var(--p-primary-contrast-color);
        }
    `
})
export class SeletorHorario {
    private visitas = inject(VisitaService);

    imovelId = input.required<number>();
    /** Prefixo dos ids (para mais de um seletor na mesma tela). */
    rotuloId = input('seletor-horario');
    /** Horário escolhido (ISO), ou nulo. */
    selecionado = model<string | null>(null);

    dias = signal<DiaHorarios[]>([]);
    carregando = signal(true);
    erro = signal<string | null>(null);
    diaEscolhido = signal<string | null>(null);
    horariosDoDia = computed(() => this.dias().find((d) => d.dia === this.diaEscolhido())?.horarios ?? []);

    constructor() {
        effect(() => {
            const id = this.imovelId();
            untracked(() => this.carregar(id));
        });
    }

    private carregar(id: number) {
        this.carregando.set(true);
        this.erro.set(null);
        this.visitas.horarios(id).subscribe({
            next: (d) => {
                this.dias.set(d);
                this.diaEscolhido.set(d[0]?.dia ?? null);
                this.carregando.set(false);
            },
            error: (e) => {
                this.erro.set(mensagemErro(e));
                this.carregando.set(false);
            }
        });
    }

    escolherDia(dia: string) {
        this.diaEscolhido.set(dia);
        this.selecionado.set(null);
    }

    private static data(dia: string): Date {
        const [a, m, d] = dia.split('-').map(Number);
        return new Date(a, m - 1, d);
    }

    semana(dia: string) {
        return fmtDiaSemana.format(SeletorHorario.data(dia)).replace('.', '');
    }

    dataCurta(dia: string) {
        return fmtDia.format(SeletorHorario.data(dia));
    }

    hora(iso: string) {
        return fmtHora.format(new Date(iso));
    }
}
