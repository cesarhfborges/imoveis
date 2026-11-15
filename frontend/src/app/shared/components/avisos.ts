import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { AreaAviso, AvisoPublico } from '@/app/core/models/models';
import { AvisosService } from '@/app/core/services/avisos.service';
import { AuthService } from '@/app/core/services/auth.service';
import { AvisoView } from './aviso-view';

/**
 * Exibe os avisos pendentes da área: as mensagens ficam em barras fixas no topo/rodapé (todas de uma vez);
 * diálogos e drawers aparecem um por vez, pela ordem cadastrada, para não empilhar janelas.
 * Recarrega quando o usuário entra ou sai (o público e os aceites mudam).
 */
@Component({
    selector: 'app-avisos',
    imports: [AvisoView],
    template: `
        @if (topo().length) {
            <div class="avisos-barra avisos-barra--topo" role="region" aria-label="Avisos">
                @for (a of topo(); track a.id + '-' + a.versao) {
                    <app-aviso-view [aviso]="a" (aceito)="aceitar(a)" (dispensado)="dispensar(a)" />
                }
            </div>
        }
        @if (rodape().length) {
            <div class="avisos-barra avisos-barra--rodape" role="region" aria-label="Avisos">
                @for (a of rodape(); track a.id + '-' + a.versao) {
                    <app-aviso-view [aviso]="a" (aceito)="aceitar(a)" (dispensado)="dispensar(a)" />
                }
            </div>
        }
        @if (janela(); as a) {
            <app-aviso-view [aviso]="a" [visivel]="true" (aceito)="aceitar(a)" (dispensado)="dispensar(a)" />
        }
    `,
    styles: `
        .avisos-barra {
            position: fixed;
            left: 0;
            right: 0;
            z-index: 1100;
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            padding: 0.75rem;
            pointer-events: none;
        }
        .avisos-barra > * {
            pointer-events: auto;
            width: 100%;
            max-width: 72rem;
            margin: 0 auto;
        }
        .avisos-barra--topo {
            top: 0;
        }
        .avisos-barra--rodape {
            bottom: 0;
        }
    `
})
export class Avisos {
    private servico = inject(AvisosService);
    private auth = inject(AuthService);

    area = input<AreaAviso>('SITE');

    private lista = signal<AvisoPublico[]>([]);
    /** Muda a cada aceite/dispensa para recalcular os pendentes. */
    private mudancas = signal(0);

    private pendentes = computed(() => {
        this.mudancas();
        return this.lista().filter((a) => this.servico.pendente(a));
    });
    topo = computed(() => this.pendentes().filter((a) => a.tipo === 'MENSAGEM' && a.posicao === 'top'));
    rodape = computed(() => this.pendentes().filter((a) => a.tipo === 'MENSAGEM' && a.posicao !== 'top'));
    janela = computed(() => this.pendentes().find((a) => a.tipo !== 'MENSAGEM') ?? null);

    constructor() {
        effect(() => {
            const area = this.area();
            this.auth.logado();
            if (!this.auth.carregada()) return;
            untracked(() => this.servico.vigentes(area).subscribe((l) => this.lista.set(l)));
        });
    }

    aceitar(a: AvisoPublico) {
        this.servico.aceitar(a);
        this.mudancas.update((n) => n + 1);
    }

    dispensar(a: AvisoPublico) {
        this.servico.dispensar(a);
        this.mudancas.update((n) => n + 1);
    }
}
